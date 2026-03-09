import Stripe from "stripe";

import { env } from "@/lib/env";

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  if (!stripeClient) {
    stripeClient = new Stripe(env.stripeSecretKey(), {
      apiVersion: "2025-02-24.acacia",
    });
  }

  return stripeClient;
}

export const PREMIUM_PLAN = {
  amount: 9900,
  currency: "krw",
  interval: "month" as const,
  productName: "자소서바이브 프리미엄",
};
