import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    await supabase
      .from("profiles")
      .update({
        subscription_status: "canceled",
        billing_key: null,
        toss_customer_key: null,
      })
      .eq("id", user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "구독 취소 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
