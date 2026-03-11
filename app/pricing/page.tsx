"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";

import { PortoneBillingButton } from "@/components/portone-billing-button";
import { StripeCheckoutButton } from "@/components/stripe-checkout-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useUser } from "@/hooks/use-user";

const portoneStoreId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID ?? "";
const portonePgProvider = process.env.NEXT_PUBLIC_PORTONE_PG_PROVIDER ?? "";

const freePlan = {
  name: "무료",
  price: "0원",
  features: ["하루 3회 생성", "문항별 결과 보기", "PDF 다운로드"],
};

const premiumPlan = {
  name: "프리미엄",
  price: "4,900원",
  features: [
    "일일 생성 횟수 무제한",
    "더 자연스럽게 재생성 무제한",
    "생성 히스토리 관리",
    "PDF 다운로드",
  ],
};

export default function PricingPage() {
  const { user, isPremium, loading } = useUser();
  const [canceling, setCanceling] = useState(false);

  async function cancelSubscription() {
    setCanceling(true);
    try {
      const response = await fetch("/api/portone/cancel", { method: "POST" });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "구독 취소에 실패했습니다.");
      }

      toast.success("구독이 취소되었습니다. 남은 기간까지 프리미엄을 이용할 수 있습니다.");
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "구독 취소 중 오류가 발생했습니다.");
    } finally {
      setCanceling(false);
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
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-zinc-900">요금제</h1>
        <p className="mt-2 text-zinc-500">나에게 맞는 플랜을 선택하세요.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* 무료 플랜 */}
        <Card>
          <CardHeader>
            <CardTitle>{freePlan.name}</CardTitle>
            <CardDescription>기본 기능을 무료로 이용하세요.</CardDescription>
            <p className="mt-2 text-3xl font-bold text-zinc-900">{freePlan.price}<span className="text-base font-normal text-zinc-500"> /월</span></p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2.5 text-sm text-zinc-700">
              {freePlan.features.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-zinc-400" />
                  {f}
                </li>
              ))}
            </ul>
            <Button variant="outline" className="w-full" disabled>
              {isPremium ? "무료 플랜" : "현재 이용 중"}
            </Button>
          </CardContent>
        </Card>

        {/* 프리미엄 플랜 */}
        <Card className="border-zinc-900 shadow-lg">
          <CardHeader>
            <div className="mb-1 inline-block w-fit rounded-full bg-zinc-900 px-3 py-0.5 text-xs font-semibold text-white">
              추천
            </div>
            <CardTitle>{premiumPlan.name}</CardTitle>
            <CardDescription>무제한으로 자소서를 생성하세요.</CardDescription>
            <p className="mt-2 text-3xl font-bold text-zinc-900">{premiumPlan.price}<span className="text-base font-normal text-zinc-500"> /월</span></p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2.5 text-sm text-zinc-700">
              {premiumPlan.features.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" />
                  {f}
                </li>
              ))}
            </ul>
            {isPremium ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={cancelSubscription}
                disabled={canceling}
              >
                {canceling ? <Spinner /> : null}
                구독 취소하기
              </Button>
            ) : user ? (
              portoneStoreId.trim().length > 0 ? (
                <PortoneBillingButton
                  storeId={portoneStoreId}
                  pgProvider={portonePgProvider || undefined}
                  userId={user.id}
                  userEmail={user.email ?? undefined}
                />
              ) : (
                <StripeCheckoutButton />
              )
            ) : (
              <Button className="h-12 w-full text-base" size="lg" onClick={() => { window.location.href = "/"; }}>
                로그인 후 구독하기
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
