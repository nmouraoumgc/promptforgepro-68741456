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
        window.Paddle.Initialize({ token: clientToken });
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
