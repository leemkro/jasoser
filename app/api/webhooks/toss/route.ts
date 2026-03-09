import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { eventType, data } = body as {
      eventType: string;
      data: {
        paymentKey?: string;
        orderId?: string;
        status?: string;
        customerKey?: string;
      };
    };

    const admin = createSupabaseAdminClient();
    if (!admin) {
      return NextResponse.json({ received: true, skipped: "No service role key" });
    }

    if (eventType === "PAYMENT_STATUS_CHANGED" && data.status === "DONE") {
      // 결제 성공 처리
      if (data.customerKey) {
        const periodEnd = new Date();
        periodEnd.setDate(periodEnd.getDate() + 30);

        await admin
          .from("profiles")
          .update({
            subscription_status: "active",
            current_period_end: periodEnd.toISOString(),
          })
          .eq("toss_customer_key", data.customerKey);
      }
    }

    if (eventType === "PAYMENT_STATUS_CHANGED" && data.status === "CANCELED") {
      if (data.customerKey) {
        await admin
          .from("profiles")
          .update({ subscription_status: "canceled", billing_key: null })
          .eq("toss_customer_key", data.customerKey);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook processing failed" },
      { status: 500 },
    );
  }
}
