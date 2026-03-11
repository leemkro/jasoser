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
  const { user, loading, credits, freeTrialRemaining, totalRemaining } = useUser();

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
        {user ? (
          <p className="mt-1 text-sm text-zinc-600">
            현재 남은 생성 가능 횟수: {totalRemaining}회 (무료체험 {freeTrialRemaining}회 + 이용권 {credits}회)
          </p>
        ) : null}
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
                <Button
                  className="h-12 w-full text-base"
                  size="lg"
                  onClick={() => {
                    window.location.href = "/";
                  }}
                >
                  로그인 후 구매하기
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-zinc-200 bg-zinc-50/70">
        <CardHeader>
          <CardTitle>이용권 정책 안내</CardTitle>
          <CardDescription>결제 전 아래 내용을 확인해 주세요.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 text-sm leading-6 text-zinc-700">
          <div className="space-y-1">
            <p className="font-semibold text-zinc-900">서비스 제공기간(건수 표시)</p>
            <p>
              결제 완료 즉시 이용권이 충전되며, 잔여 건수는 대시보드와 생성 페이지에서
              {` "남은 이용권 N회"`} 형태로 표시됩니다. 이용권은 소진 시까지 사용할 수 있으며 월 자동결제는
              제공하지 않습니다.
            </p>
          </div>

          <div className="space-y-1">
            <p className="font-semibold text-zinc-900">교환</p>
            <p>
              이용권은 무형 디지털 상품 특성상 구매 완료 후 다른 패키지로 직접 교환할 수 없습니다. 패키지를
              잘못 선택한 경우에는 미사용 건에 한해 결제 취소 후 원하는 상품으로 다시 구매해 주세요.
            </p>
          </div>

          <div className="space-y-1">
            <p className="font-semibold text-zinc-900">환불정책</p>
            <p>
              미사용 이용권은 결제일 포함 7일 이내 전액 환불을 요청할 수 있습니다. 일부 사용한 이용권은
              사용된 건수를 제외한 잔여분 기준으로 환불되며, 결제대행 수수료 등 실비가 공제될 수 있습니다.
            </p>
          </div>

          <div className="space-y-1">
            <p className="font-semibold text-zinc-900">취소규정</p>
            <p>
              결제 취소는 구매 내역 확인 후 처리됩니다. 이미 사용된 건수는 취소 대상에서 제외되며, 비정상
              사용이나 약관 위반이 확인된 경우 환불 또는 취소가 제한될 수 있습니다.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
