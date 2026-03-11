import { NextResponse } from "next/server";
import { z } from "zod";

import { getPortOnePayment, PORTONE_PREMIUM_PLAN } from "@/lib/portone";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const requestSchema = z.object({
  impUid: z.string().min(1),
  merchantUid: z.string().min(1),
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
    const orderPrefix = `sub_${user.id}_`;
    if (!body.merchantUid.startsWith(orderPrefix)) {
      return NextResponse.json({ error: "유효하지 않은 결제 요청입니다." }, { status: 400 });
    }

    const payment = await getPortOnePayment(body.impUid);
    if (payment.merchantUid !== body.merchantUid) {
      return NextResponse.json({ error: "결제 주문 정보가 일치하지 않습니다." }, { status: 400 });
    }

    if (payment.status !== "paid") {
      return NextResponse.json({ error: "결제가 완료되지 않았습니다." }, { status: 400 });
    }

    if (Math.round(payment.amount) !== PORTONE_PREMIUM_PLAN.amount) {
      return NextResponse.json({ error: "결제 금액이 올바르지 않습니다." }, { status: 400 });
    }

    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + 30);

    await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email,
      subscription_status: "active",
      billing_key: payment.impUid,
      toss_customer_key: null,
      current_period_end: periodEnd.toISOString(),
    });

    return NextResponse.json({
      success: true,
      paidAt: payment.paidAt,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "결제 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
