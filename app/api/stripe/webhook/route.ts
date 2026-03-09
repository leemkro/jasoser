import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { env } from "@/lib/env";
import { getStripeClient } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  const stripe = getStripeClient();
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      env.stripeWebhookSecret(),
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Invalid webhook signature",
      },
      { status: 400 },
    );
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ received: true, skipped: "No service role key" });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId ?? session.client_reference_id;

      if (userId) {
        await admin.from("profiles").upsert({
          id: userId,
          stripe_customer_id:
            typeof session.customer === "string" ? session.customer : session.customer?.id,
          stripe_subscription_id:
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription?.id,
          subscription_status: "active",
        });
      }
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      await admin
        .from("profiles")
        .update({
          subscription_status: subscription.status,
          stripe_subscription_id: subscription.id,
          stripe_customer_id:
            typeof subscription.customer === "string"
              ? subscription.customer
              : subscription.customer.id,
        })
        .eq(
          "stripe_customer_id",
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id,
        );
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Webhook processing failed",
      },
      { status: 500 },
    );
  }
}
