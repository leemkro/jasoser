import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { getStripeClient, PREMIUM_PLAN } from "@/lib/stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    await supabase.from("profiles").upsert({ id: user.id, email: user.email });

    const origin = env.appUrl() ?? new URL(request.url).origin;

    const stripe = getStripeClient();
    const checkedSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: profile?.stripe_customer_id ?? undefined,
      customer_email: profile?.stripe_customer_id ? undefined : user.email,
      client_reference_id: user.id,
      metadata: {
        userId: user.id,
      },
      line_items: [
        {
          price_data: {
            currency: PREMIUM_PLAN.currency,
            product_data: {
              name: PREMIUM_PLAN.productName,
            },
            recurring: {
              interval: PREMIUM_PLAN.interval,
            },
            unit_amount: PREMIUM_PLAN.amount,
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing?canceled=1`,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: checkedSession.url });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "결제 세션 생성에 실패했습니다.",
      },
      { status: 500 },
    );
  }
}
