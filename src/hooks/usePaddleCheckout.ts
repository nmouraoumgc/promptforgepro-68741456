import { useState } from "react";
import { initializePaddle, getPaddlePriceId } from "@/lib/paddle";

export type OpenCheckoutOptions = {
  priceId: string;
  customerEmail?: string;
  customData?: Record<string, string>;
  successUrl?: string;
  discountCode?: string;
};

export function usePaddleCheckout() {
  const [loading, setLoading] = useState(false);

  const openCheckout = async (options: OpenCheckoutOptions) => {
    setLoading(true);
    try {
      await initializePaddle();
      const paddlePriceId = await getPaddlePriceId(options.priceId);

      window.Paddle.Checkout.open({
        items: [{ priceId: paddlePriceId, quantity: 1 }],
        customer: options.customerEmail ? { email: options.customerEmail } : undefined,
        customData: options.customData,
        discountCode: options.discountCode,
        settings: {
          displayMode: "overlay",
          successUrl:
            options.successUrl || `${window.location.origin}/purchase-success`,
          allowLogout: false,
          variant: "one-page",
          showAddTaxId: false,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  return { openCheckout, loading };
}
