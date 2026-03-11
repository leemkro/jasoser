import { NextResponse } from "next/server";
import { z } from "zod";

import { CREDIT_PACKAGES, getPortOnePayment } from "@/lib/portone";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTotalRemainingUsage } from "@/lib/usage";

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
    const selectedPackage = CREDIT_PACKAGES.find((item) =>
      body.merchantUid.startsWith(`credits_${item.id}_${user.id}_`),
    );
    if (!selectedPackage) {
      return NextResponse.json({ error: "유효하지 않은 결제 요청입니다." }, { status: 400 });
    }

    const payment = await getPortOnePayment(body.impUid);
    if (payment.merchantUid !== body.merchantUid) {
      return NextResponse.json({ error: "결제 주문 정보가 일치하지 않습니다." }, { status: 400 });
    }

    if (payment.status !== "paid") {
      return NextResponse.json({ error: "결제가 완료되지 않았습니다." }, { status: 400 });
    }

    if (Math.round(payment.amount) !== selectedPackage.amount) {
      return NextResponse.json({ error: "결제 금액이 올바르지 않습니다." }, { status: 400 });
    }

    const purchaseInsert = await supabase.from("credit_purchases").insert({
      user_id: user.id,
      imp_uid: payment.impUid,
      merchant_uid: payment.merchantUid,
      package_id: selectedPackage.id,
      amount: selectedPackage.amount,
      credits: selectedPackage.credits,
    });

    if (purchaseInsert.error) {
      if (purchaseInsert.error.code === "23505") {
        const [{ data: profile }, generationCountResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("credits")
            .eq("id", user.id)
            .maybeSingle(),
          supabase
            .from("generations")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id),
        ]);
        const remainingTotal = getTotalRemainingUsage(profile?.credits ?? 0, generationCountResult.count ?? 0);

        return NextResponse.json({
          success: true,
          creditsAdded: 0,
          remainingCredits: remainingTotal,
          remainingTotal,
          alreadyProcessed: true,
        });
      }

      throw new Error(purchaseInsert.error.message);
    }

    const [{ data: profile, error: profileError }, generationCountResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("credits")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("generations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);

    if (profileError) {
      throw new Error(profileError.message);
    }

    const nextCredits = (profile?.credits ?? 0) + selectedPackage.credits;
    const remainingTotal = getTotalRemainingUsage(nextCredits, generationCountResult.count ?? 0);

    const profileUpsert = await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email,
      subscription_status: "free",
      billing_key: payment.impUid,
      credits: nextCredits,
    });

    if (profileUpsert.error) {
      throw new Error(profileUpsert.error.message);
    }

    return NextResponse.json({
      success: true,
      creditsAdded: selectedPackage.credits,
      remainingCredits: remainingTotal,
      remainingTotal,
      paidAt: payment.paidAt,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "결제 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
