"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";

import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export default function PricingPage() {
  const { user, isPremium, loading } = useUser();
  const [submitting, setSubmitting] = useState(false);

  async function startCheckout() {
    if (!user) {
      toast.error("먼저 로그인해 주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
      });

      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? "결제 페이지 생성에 실패했습니다.");
      }

      window.location.href = payload.url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "결제 시작 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">프리미엄 요금제</CardTitle>
          <CardDescription>월 9,900원으로 자소서 생성 제한을 확장하세요.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2 text-sm text-zinc-700">
            {[
              "생성 횟수 확장",
              "더 자연스럽게 재생성 무제한",
              "우선 처리로 더 빠른 응답",
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600" />
                {feature}
              </li>
            ))}
          </ul>

          <div className="rounded-lg bg-zinc-900 p-4 text-white">
            <p className="text-sm text-zinc-300">월 구독</p>
            <p className="text-3xl font-bold">9,900원</p>
          </div>

          <Button className="w-full" size="lg" onClick={startCheckout} disabled={submitting}>
            {submitting ? <Spinner /> : null}
            {isPremium ? "프리미엄 이용 중" : "프리미엄 시작하기"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
