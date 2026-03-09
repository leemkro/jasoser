import { NextResponse } from "next/server";
import { z } from "zod";

import { issueBillingKey, chargeBilling } from "@/lib/toss";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const requestSchema = z.object({
  authKey: z.string().min(1),
  customerKey: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const body = requestSchema.parse(await request.json());

    // 1. 빌링키 발급
    const billing = await issueBillingKey(body.authKey, body.customerKey);

    // 2. 첫 결제 실행
    const orderId = `sub_${user.id}_${Date.now()}`;
    const payment = await chargeBilling(billing.billingKey, body.customerKey, orderId);

    // 3. 구독 정보 저장 (current_period_end = 30일 후)
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + 30);

    await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email,
      subscription_status: "active",
      billing_key: billing.billingKey,
      toss_customer_key: body.customerKey,
      current_period_end: periodEnd.toISOString(),
    });

    return NextResponse.json({
      success: true,
      cardNumber: billing.cardNumber,
      approvedAt: payment.approvedAt,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "결제 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
