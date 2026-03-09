"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { GenerationResult } from "@/components/generation-result";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useSupabase } from "@/hooks/use-supabase";
import { useUser } from "@/hooks/use-user";
import type { GeneratedEssay } from "@/lib/types";
import { cn } from "@/lib/utils";

function parseCustomQuestions(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

const formSchema = z
  .object({
    company: z.string().min(1, "기업명을 입력하세요."),
    role: z.string().min(1, "직무를 입력하세요."),
    posting: z.string().min(10, "채용공고 텍스트 또는 URL을 입력하세요."),
    experience: z.string().min(20, "본인 경험을 더 자세히 작성해 주세요."),
    tone: z.enum(["담백한", "열정적인", "전문적인", "친근한"]),
    characterLimit: z.coerce.number().min(300).max(2000),
    questionMode: z.enum(["auto", "custom"]),
    customQuestionsText: z.string(),
  })
  .superRefine((value, ctx) => {
    if (value.questionMode !== "custom") {
      return;
    }

    const questions = parseCustomQuestions(value.customQuestionsText);
    if (questions.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customQuestionsText"],
        message: "문항 직접 입력 모드에서는 문항을 1개 이상 입력해야 합니다.",
      });
    }

    if (questions.length > 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customQuestionsText"],
        message: "문항은 최대 10개까지 입력할 수 있습니다.",
      });
    }
  });

type FormValues = z.infer<typeof formSchema>;

export default function CreatePage() {
  const { user, isPremium, loading: userLoading } = useUser();
  const usage = useSupabase(user?.id);
  const userId = user?.id;
  const { getLocalRemainingCount, getRemainingCount } = usage;
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<GeneratedEssay | null>(null);
  const [naturalMode, setNaturalMode] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    return getLocalRemainingCount();
  });

  useEffect(() => {
    if (!userId || isPremium) return;
    setRemaining(getLocalRemainingCount());
    getRemainingCount().then(setRemaining);
  }, [userId, isPremium, getLocalRemainingCount, getRemainingCount]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      company: "",
      role: "",
      posting: "",
      experience: "",
      tone: "담백한",
      characterLimit: 800,
      questionMode: "auto",
      customQuestionsText: "",
    },
  });

  const isBlocked = useMemo(() => {
    if (isPremium) {
      return false;
    }
    if (remaining === null) {
      return false;
    }
    return remaining <= 0;
  }, [isPremium, remaining]);

  async function submit(values: FormValues) {
    if (!user) {
      toast.error("로그인이 필요합니다.");
      return;
    }

    setSubmitting(true);

    const remainingCount = await usage.getRemainingCount();

    if (!isPremium && remainingCount <= 0) {
      toast.error("무료 생성 횟수를 모두 사용했습니다. 프리미엄을 이용해 주세요.");
      setSubmitting(false);
      return;
    }
    try {
      const { customQuestionsText, ...requestValues } = values;
      const customQuestions = requestValues.questionMode === "custom"
        ? parseCustomQuestions(customQuestionsText)
        : undefined;

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...requestValues,
          customQuestions,
          makeNatural: naturalMode,
        }),
      });

      const payload = (await response.json()) as {
        result?: GeneratedEssay;
        error?: string;
        remaining?: number;
        historySaved?: boolean;
      };

      if (!response.ok || !payload.result) {
        throw new Error(payload.error ?? "생성에 실패했습니다.");
      }

      setResult(payload.result);
      if (typeof payload.remaining === "number") {
        setRemaining(payload.remaining);
        usage.syncLocalFromRemaining(payload.remaining);
      } else if (!isPremium) {
        usage.incrementLocalFallback();
      }

      toast.success("자소서 초안이 생성되었습니다.");
      if (payload.historySaved === false) {
        toast.error("생성 히스토리 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function regenerateNatural() {
    if (!isPremium && remaining !== null && remaining <= 0) {
      toast.error("무료 생성 횟수를 모두 사용했습니다. 프리미엄을 이용해 주세요.");
      return;
    }

    if (!isPremium) {
      const remainingCount = await usage.getRemainingCount();
      setRemaining(remainingCount);

      if (remainingCount <= 0) {
        usage.syncLocalFromRemaining(remainingCount);
        toast.error("무료 생성 횟수를 모두 사용했습니다. 프리미엄을 이용해 주세요.");
        return;
      }
    }

    setNaturalMode(true);
    try {
      await form.handleSubmit(submit)();
    } finally {
      setNaturalMode(false);
    }
  }

  const questionMode = form.watch("questionMode");

  if (userLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
      <Card>
        <CardHeader>
          <CardTitle>자소서 생성</CardTitle>
          <CardDescription>
            기업/직무 정보와 본인 경험을 입력하면 문항 자동 생성 또는 직접 입력 문항 기반으로
            자소서 초안을 만듭니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="company">기업명</Label>
              <Input id="company" {...form.register("company")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">직무</Label>
              <Input id="role" {...form.register("role")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="posting">채용공고 텍스트/URL</Label>
            <Textarea id="posting" {...form.register("posting")} className="min-h-[100px]" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="experience">본인 경험</Label>
            <Textarea
              id="experience"
              {...form.register("experience")}
              className="min-h-[180px]"
            />
          </div>

          <div className="space-y-3">
            <Label>문항 구성 방식</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label
                htmlFor="question-mode-auto"
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-md border p-3",
                  questionMode === "auto" ? "border-zinc-900 bg-zinc-50" : "border-zinc-200",
                )}
              >
                <input
                  id="question-mode-auto"
                  type="radio"
                  value="auto"
                  className="mt-1 h-4 w-4 accent-zinc-900"
                  {...form.register("questionMode")}
                />
                <div>
                  <p className="text-sm font-medium">AI 자율 문항</p>
                  <p className="text-xs text-zinc-500">AI가 문항을 구성해 답변합니다.</p>
                </div>
              </label>

              <label
                htmlFor="question-mode-custom"
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-md border p-3",
                  questionMode === "custom" ? "border-zinc-900 bg-zinc-50" : "border-zinc-200",
                )}
              >
                <input
                  id="question-mode-custom"
                  type="radio"
                  value="custom"
                  className="mt-1 h-4 w-4 accent-zinc-900"
                  {...form.register("questionMode")}
                />
                <div>
                  <p className="text-sm font-medium">문항 직접 입력</p>
                  <p className="text-xs text-zinc-500">내가 넣은 문항에 맞춰 답변합니다.</p>
                </div>
              </label>
            </div>
          </div>

          {questionMode === "custom" ? (
            <div className="space-y-2">
              <Label htmlFor="customQuestionsText">문항 입력</Label>
              <Textarea
                id="customQuestionsText"
                {...form.register("customQuestionsText")}
                className="min-h-[120px]"
                placeholder={"예)\n1. 지원 동기\n2. 성격의 장단점\n3. 입사 후 포부"}
              />
              {form.formState.errors.customQuestionsText?.message ? (
                <p className="text-sm text-red-600">
                  {form.formState.errors.customQuestionsText.message}
                </p>
              ) : (
                <p className="text-xs text-zinc-500">
                  한 줄에 문항 1개씩 입력하세요. 최대 10개까지 가능합니다.
                </p>
              )}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>톤</Label>
              <Select
                value={form.watch("tone")}
                onValueChange={(value) => form.setValue("tone", value as FormValues["tone"])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="톤 선택" />
                </SelectTrigger>
                <SelectContent>
                  {(["담백한", "열정적인", "전문적인", "친근한"] as const).map((tone) => (
                    <SelectItem key={tone} value={tone}>
                      {tone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="characterLimit">글자 수</Label>
              <Input id="characterLimit" type="number" {...form.register("characterLimit")} />
            </div>
          </div>

          {remaining !== null && !isPremium ? (
            <p className="text-sm text-zinc-500">오늘 무료 남은 횟수: {remaining}</p>
          ) : null}

          {submitting ? (
            <div className="space-y-2">
              <Progress />
              <p className="text-center text-sm text-zinc-500">자소서를 생성하고 있습니다...</p>
            </div>
          ) : (
            <Button
              className="w-full"
              onClick={form.handleSubmit(submit)}
              disabled={isBlocked}
            >
              자소서 초안 생성
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {result ? (
          <GenerationResult
            result={result}
            onRegenerateNatural={regenerateNatural}
            loading={submitting}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>생성 결과</CardTitle>
              <CardDescription>
                생성 후 문항별 결과를 펼쳐보고, 복사 또는 PDF 다운로드할 수 있습니다.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  );
}
