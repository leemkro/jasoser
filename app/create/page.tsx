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

const formSchema = z.object({
  company: z.string().min(1, "기업명을 입력하세요."),
  role: z.string().min(1, "직무를 입력하세요."),
  posting: z.string().min(10, "채용공고 텍스트 또는 URL을 입력하세요."),
  experience: z.string().min(20, "본인 경험을 더 자세히 작성해 주세요."),
  tone: z.enum(["담백한", "열정적인", "전문적인", "친근한"]),
  characterLimit: z.coerce.number().min(300).max(2000),
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
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
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
            기업/직무 정보와 본인 경험을 입력하면 한국어 자소서 초안을 문항별로 생성합니다.
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
