import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { isEnglishNow } from "@/i18n/lang";
import { checkoutBlockMessage } from "@/lib/checkoutGuard";
import { clearCampaignCode } from "@/lib/campaignCode";

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

// ---------- In-checkout failure limit ----------
// Every failed payment inside an open Paddle checkout is reported to pre-checkout-check
// (action=payment_failed), which records it server-side with the hashed IP and answers whether the
// account (3 failures/24h) or the network (5 failures/24h) hit its limit. If so the overlay is
// closed, so cards cannot be retried indefinitely inside one checkout. The signed Paddle webhook
// records the same failures independently (transaction.payment_failed).
const FAILURE_EVENTS = new Set(["checkout.payment.failed", "checkout.payment.error"]);

async function reportPaymentFailure(attemptId: string | null, transactionId: string | null, error: string | null) {
  try {
    const { data } = await supabase.functions.invoke("pre-checkout-check", {
      body: { action: "payment_failed", attemptId, transactionId, error, environment: getPaddleEnvironment() },
    });
    if (data?.close) {
      try {
        window.Paddle?.Checkout?.close();
      } catch {
        /* overlay already gone */
      }
      const en = isEnglishNow();
      toast({
        title: en ? "Checkout closed" : "Checkout fechado",
        description: checkoutBlockMessage(typeof data.reason === "string" ? data.reason : "too_many_attempts", en),
        variant: "destructive",
      });
    }
  } catch {
    // The webhook still records the failure and pre-checkout-check enforces it on the next open.
  }
}

export function handlePaddleEvent(event: any) {
  try {
    const name: string | undefined = event?.name ?? event?.type;
    if (!name || !TRACKED_EVENTS.has(name)) return;
    if (name === "checkout.completed") clearCampaignCode();
    const d = event?.data ?? {};
    const attemptId = str(d?.custom_data?.attemptId, 64) ?? currentAttemptId;
    const errParts = [event?.type && event.type !== name ? event.type : null, event?.code, event?.detail, event?.error?.code, event?.error?.detail]
      .filter((x) => typeof x === "string" && x);
    const errText = errParts.length ? errParts.join(" | ").slice(0, 300) : null;
    if (FAILURE_EVENTS.has(name)) {
      void reportPaymentFailure(attemptId, str(d?.transaction_id, 64), errText ? errText.slice(0, 200) : null);
    }
    void supabase
      .rpc("log_checkout_event" as any, {
        _event: name,
        _attempt_id: attemptId,
        _transaction_id: str(d?.transaction_id, 64),
        _country: str(d?.customer?.address?.country_code, 2),
        _payment_method: str(d?.payment?.method_details?.type, 32),
        _error: errText,
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

// ---------- Paddle Retain ----------
// Live client-side tokens also authenticate Retain, so loading Paddle.js is all Retain needs on public pages.
// On signed-in pages Retain wants pwCustomer.id = the Paddle customer id (ctm_...); other ids are not supported.
let retainCustomerId: string | null = null;

/** Set (or clear) the Paddle customer id Retain should use; applies immediately when Paddle.js is already initialized. */
export function setRetainCustomer(id: string | null) {
  const next = typeof id === "string" && id.startsWith("ctm_") ? id : null;
  if (next === retainCustomerId) return;
  retainCustomerId = next;
  if (paddleInitialized && window.Paddle?.Update) {
    try {
      window.Paddle.Update({ pwCustomer: next ? { id: next } : {} });
    } catch {
      /* Retain is best effort */
    }
  }
}

export async function initializePaddle(): Promise<void> {
  if (paddleInitialized) return;
  if (initPromise) return initPromise;

  if (!clientToken) {
    throw new Error("VITE_PAYMENTS_CLIENT_TOKEN is not set");
  }

  initPromise = new Promise<void>((resolve, reject) => {
    const onLoad = () => {
      try {
        if (paddleInitialized) return resolve();
        if (window.Paddle.Initialized) {
          // Already initialized (only one Paddle.js copy per page): just sync pwCustomer.
          paddleInitialized = true;
          if (retainCustomerId) window.Paddle.Update({ pwCustomer: { id: retainCustomerId } });
          return resolve();
        }
        const env = getPaddleEnvironment() === "sandbox" ? "sandbox" : "production";
        window.Paddle.Environment.set(env);
        window.Paddle.Initialize({
          token: clientToken,
          eventCallback: handlePaddleEvent,
          ...(retainCustomerId ? { pwCustomer: { id: retainCustomerId } } : {}),
        });
        paddleInitialized = true;
        resolve();
      } catch (e) {
        initPromise = null;
        reject(e);
      }
    };

    // index.html ships a static <script src=".../paddle/v2/paddle.js" data-paddle="true" defer>.
    // Reuse it: never inject a second copy.
    if (window.Paddle) {
      onLoad();
      return;
    }
    const existing = document.querySelector(
      'script[data-paddle="true"], script[src^="https://cdn.paddle.com/paddle/v2/paddle.js"]',
    ) as HTMLScriptElement | null;
    const onError = (e: unknown) => {
      initPromise = null;
      reject(e);
    };
    if (existing) {
      existing.addEventListener("load", onLoad, { once: true });
      existing.addEventListener("error", onError, { once: true });
      // The load event may have fired between the window.Paddle check and the listener.
      if (window.Paddle) onLoad();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.dataset.paddle = "true";
    script.onload = onLoad;
    script.onerror = onError;
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
