import { NextResponse } from "next/server";
import { z } from "zod";

import { generateEssay } from "@/lib/openai";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const DAILY_LIMIT = 3;

export const runtime = "nodejs";

const requestSchema = z.object({
  company: z.string().min(1),
  role: z.string().min(1),
  posting: z.string().min(10),
  experience: z.string().min(20),
  tone: z.enum(["담백한", "열정적인", "전문적인", "친근한"]),
  characterLimit: z.number().min(300).max(2000),
  questionMode: z.enum(["auto", "custom"]).default("auto"),
  customQuestions: z
    .array(z.string().trim().min(1))
    .min(1)
    .max(10)
    .optional(),
  makeNatural: z.boolean().default(false),
}).superRefine((value, ctx) => {
  if (value.questionMode === "custom" && !value.customQuestions) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["customQuestions"],
      message: "직접 문항 모드에서는 문항을 1개 이상 입력해야 합니다.",
    });
  }
});

function today() {
  return new Date().toISOString().slice(0, 10);
}

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

    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_status")
      .eq("id", user.id)
      .single();

    const premium = ["active", "trialing"].includes(profile?.subscription_status ?? "free");

    let remaining = null as number | null;
    let usageTrackingUnavailable = false;
    let usageRow: { id: string; used_count: number | null } | null = null;
    if (!premium) {
      const usageQuery = await supabase
        .from("daily_usage")
        .select("id, used_count")
        .eq("user_id", user.id)
        .eq("feature", "generation")
        .eq("usage_date", today())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (usageQuery.error) {
        usageTrackingUnavailable = true;
      }

      usageRow = usageQuery.data;
      if (!usageTrackingUnavailable && (usageRow?.used_count ?? 0) >= DAILY_LIMIT) {
        return NextResponse.json(
          { error: "오늘 무료 생성 횟수를 모두 사용했습니다." },
          { status: 429 },
        );
      }
    }

    const result = await generateEssay(body);

    const generationPayload = {
      user_id: user.id,
      company: body.company,
      role: body.role,
      tone: body.tone,
      input: {
        posting: body.posting,
        experience: body.experience,
        questionMode: body.questionMode,
        customQuestions: body.questionMode === "custom" ? body.customQuestions ?? [] : null,
      },
      output: result,
    };

    let historySaved = true;
    const historyInsert = await supabase.from("generations").insert(generationPayload);
    if (historyInsert.error) {
      historySaved = false;
      console.error("Failed to save generation history (user client):", historyInsert.error);

      const admin = createSupabaseAdminClient();
      if (admin) {
        const adminInsert = await admin.from("generations").insert(generationPayload);
        if (adminInsert.error) {
          console.error("Failed to save generation history (admin client):", adminInsert.error);
        } else {
          historySaved = true;
        }
      }
    }

    if (!premium && !usageTrackingUnavailable) {
      if (!usageRow) {
        const insertResult = await supabase
          .from("daily_usage")
          .insert({
            user_id: user.id,
            feature: "generation",
            usage_date: today(),
            used_count: 1,
            limit_count: DAILY_LIMIT,
          })
          .select("used_count")
          .single();

        if (!insertResult.error && insertResult.data) {
          remaining = Math.max(0, DAILY_LIMIT - (insertResult.data.used_count ?? 0));
        } else {
          console.error("Failed to increment usage after generation (insert):", insertResult.error);
        }
      } else {
        const updateResult = await supabase
          .from("daily_usage")
          .update({ used_count: (usageRow.used_count ?? 0) + 1 })
          .eq("id", usageRow.id)
          .select("used_count")
          .single();

        if (!updateResult.error && updateResult.data) {
          remaining = Math.max(0, DAILY_LIMIT - (updateResult.data.used_count ?? 0));
        } else {
          console.error("Failed to increment usage after generation (update):", updateResult.error);
        }
      }
    }

    return NextResponse.json({ result, remaining, historySaved });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "입력값이 올바르지 않습니다." }, { status: 400 });
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "생성 중 알 수 없는 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
