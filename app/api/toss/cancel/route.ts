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

    // 빌링키 제거 + 구독 상태를 canceled로 변경
    // current_period_end까지는 프리미엄 유지
    await supabase.from("profiles").update({
      subscription_status: "canceled",
      billing_key: null,
    }).eq("id", user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "구독 취소 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
