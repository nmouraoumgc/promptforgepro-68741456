import { supabase } from "@/integrations/supabase/client";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

declare global {
  interface Window {
    Paddle: any;
  }
}

export function getPaddleEnvironment(): "sandbox" | "live" {
  return clientToken?.startsWith("test_") ? "sandbox" : "live";
}

let paddleInitialized = false;

// ---------- Checkout event telemetry ----------
// Records Paddle.js checkout lifecycle events (no PII: only event name, Paddle
// transaction id, country, payment method type and error code) via the
// `log_checkout_event` RPC, which links them to the caller's checkout_attempts row.
const TRACKED_EVENTS = new Set([
  "checkout.loaded",
  "checkout.customer.created",
  "checkout.payment.selected",
  "checkout.payment.initiated",
  "checkout.payment.failed",
  "checkout.payment.error",
  "checkout.error",
  "checkout.warning",
  "checkout.closed",
  "checkout.completed",
]);

let currentAttemptId: string | null = null;

/** Set the checkout_attempts id returned by pre-checkout-check for the checkout about to open. */
export function setCheckoutAttemptId(id: string | null | undefined) {
  currentAttemptId = typeof id === "string" && id ? id : null;
}

function str(v: unknown, max = 300): string | null {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
}

export function handlePaddleEvent(event: any) {
  try {
    const name: string | undefined = event?.name ?? event?.type;
    if (!name || !TRACKED_EVENTS.has(name)) return;
    const d = event?.data ?? {};
    const attemptId = str(d?.custom_data?.attemptId, 64) ?? currentAttemptId;
    const errParts = [event?.type && event.type !== name ? event.type : null, event?.code, event?.detail, event?.error?.code, event?.error?.detail]
      .filter((x) => typeof x === "string" && x);
    void supabase
      .rpc("log_checkout_event" as any, {
        _event: name,
        _attempt_id: attemptId,
        _transaction_id: str(d?.transaction_id, 64),
        _country: str(d?.customer?.address?.country_code, 2),
        _payment_method: str(d?.payment?.method_details?.type, 32),
        _error: errParts.length ? errParts.join(" | ").slice(0, 300) : null,
      } as any)
      .then(({ error }) => {
        if (error) console.warn("checkout event log failed", error.message);
      });
    // Next checkout gets a fresh attempt id from pre-checkout-check.
    if (name === "checkout.closed") currentAttemptId = null;
  } catch {
    // Telemetry must never break checkout.
  }
}

let initPromise: Promise<void> | null = null;

export async function initializePaddle(): Promise<void> {
  if (paddleInitialized) return;
  if (initPromise) return initPromise;

  if (!clientToken) {
    throw new Error("VITE_PAYMENTS_CLIENT_TOKEN is not set");
  }

  initPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[data-paddle="true"]') as HTMLScriptElement | null;
    const onLoad = () => {
      try {
        const env = getPaddleEnvironment() === "sandbox" ? "sandbox" : "production";
        window.Paddle.Environment.set(env);
        window.Paddle.Initialize({ token: clientToken, eventCallback: handlePaddleEvent });
        paddleInitialized = true;
        resolve();
      } catch (e) {
        reject(e);
      }
    };

    if (existing && window.Paddle) {
      onLoad();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.dataset.paddle = "true";
    script.onload = onLoad;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return initPromise;
}

const priceCache = new Map<string, string>();

export async function getPaddlePriceId(priceId: string): Promise<string> {
  const environment = getPaddleEnvironment();
  const cacheKey = `${environment}:${priceId}`;
  const cached = priceCache.get(cacheKey);
  if (cached) return cached;

  const { data, error } = await supabase.functions.invoke("get-paddle-price", {
    body: { priceId, environment },
  });
  if (error || !data?.paddleId) {
    throw new Error(`Failed to resolve price: ${priceId}`);
  }
  priceCache.set(cacheKey, data.paddleId);
  return data.paddleId;
}

const discountCache = new Map<string, string>();

export async function getPaddleDiscountId(discountCode: string): Promise<string> {
  const environment = getPaddleEnvironment();
  const normalizedCode = discountCode.trim().toUpperCase();
  const cacheKey = `${environment}:${normalizedCode}`;
  const cached = discountCache.get(cacheKey);
  if (cached) return cached;

  const { data, error } = await supabase.functions.invoke("get-paddle-price", {
    body: { discountCode: normalizedCode, environment },
  });
  if (error || !data?.discountId) {
    throw new Error(`Failed to resolve discount: ${normalizedCode}`);
  }
  discountCache.set(cacheKey, data.discountId);
  return data.discountId;
}
