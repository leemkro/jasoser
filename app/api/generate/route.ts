import { NextResponse } from "next/server";
import { z } from "zod";

import { generateEssay } from "@/lib/openai";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: "이용권 정보를 불러오지 못했습니다." }, { status: 500 });
    }

    const currentCredits = Math.max(0, profile?.credits ?? 0);
    if (currentCredits <= 0) {
      return NextResponse.json(
        { error: "이용권이 부족합니다. 이용권 충전 후 다시 시도해 주세요." },
        { status: 429 },
      );
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

    let remaining = Math.max(0, currentCredits - 1);
    const creditUpdate = await supabase
      .from("profiles")
      .update({ credits: remaining })
      .eq("id", user.id)
      .select("credits")
      .single();

    if (!creditUpdate.error && creditUpdate.data) {
      remaining = Math.max(0, creditUpdate.data.credits ?? remaining);
    } else {
      console.error("Failed to decrement credits after generation:", creditUpdate.error);
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
