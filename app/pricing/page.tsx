"use client";

import { Check } from "lucide-react";

import { CREDIT_PACKAGES } from "@/lib/credit-packages";
import { PortoneBillingButton } from "@/components/portone-billing-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useUser } from "@/hooks/use-user";

const portoneStoreId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID ?? "";
const portonePgProvider = process.env.NEXT_PUBLIC_PORTONE_PG_PROVIDER ?? "";

export default function PricingPage() {
  const { user, loading, credits } = useUser();

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-zinc-900">이용권 충전</h1>
        <p className="mt-2 text-zinc-500">필요한 횟수만큼 이용권을 구매해 사용하세요.</p>
        {user ? <p className="mt-1 text-sm text-zinc-600">현재 남은 이용권: {credits}회</p> : null}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {CREDIT_PACKAGES.map((item) => (
          <Card key={item.id} className={item.highlight ? "border-zinc-900 shadow-lg" : ""}>
            <CardHeader>
              {item.highlight ? (
                <div className="mb-1 inline-block w-fit rounded-full bg-zinc-900 px-3 py-0.5 text-xs font-semibold text-white">
                  추천
                </div>
              ) : null}
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>{item.credits}회 생성 가능한 충전형 이용권</CardDescription>
              <p className="mt-2 text-3xl font-bold text-zinc-900">
                {item.amount.toLocaleString("ko-KR")}원
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2.5 text-sm text-zinc-700">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" />
                  구매 즉시 이용권 충전
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" />
                  1회 생성 시 이용권 1회 차감
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" />
                  문항별 결과 보기, PDF 다운로드 포함
                </li>
              </ul>
              {user ? (
                portoneStoreId.trim().length > 0 ? (
                  <PortoneBillingButton
                    storeId={portoneStoreId}
                    pgProvider={portonePgProvider || undefined}
                    userId={user.id}
                    userEmail={user.email ?? undefined}
                    creditPackage={item}
                  />
                ) : (
                  <Button className="h-12 w-full text-base" size="lg" disabled>
                    결제 설정이 필요합니다
                  </Button>
                )
              ) : (
                <Button className="h-12 w-full text-base" size="lg" onClick={() => { window.location.href = "/"; }}>
                  로그인 후 구매하기
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
