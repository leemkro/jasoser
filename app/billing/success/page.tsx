"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export default function BillingSuccessPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [creditsAdded, setCreditsAdded] = useState(0);
  const [remainingCount, setRemainingCount] = useState(0);

  useEffect(() => {
    const impUid = searchParams.get("imp_uid") ?? searchParams.get("impUid");
    const merchantUid = searchParams.get("merchant_uid") ?? searchParams.get("merchantUid");
    const impSuccess = searchParams.get("imp_success");

    if (impSuccess === "false") {
      setStatus("error");
      setErrorMessage(searchParams.get("error_msg") ?? "결제 승인에 실패했습니다.");
      return;
    }

    if (!impUid || !merchantUid) {
      setStatus("error");
      setErrorMessage("결제 인증 정보가 없습니다.");
      return;
    }

    async function confirm() {
      try {
        const response = await fetch("/api/portone/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ impUid, merchantUid }),
        });

        const payload = (await response.json()) as {
          success?: boolean;
          error?: string;
          creditsAdded?: number;
          remainingCredits?: number;
          remainingTotal?: number;
        };

        if (!response.ok || !payload.success) {
          throw new Error(payload.error ?? "결제 처리에 실패했습니다.");
        }

        setCreditsAdded(payload.creditsAdded ?? 0);
        setRemainingCount(payload.remainingTotal ?? payload.remainingCredits ?? 0);
        setStatus("success");
        toast.success("이용권 충전이 완료되었습니다!");
      } catch (error) {
        setStatus("error");
        setErrorMessage(error instanceof Error ? error.message : "결제 처리 중 오류가 발생했습니다.");
      }
    }

    confirm();
  }, [searchParams]);

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-md">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Spinner className="h-8 w-8" />
            <p className="text-sm text-zinc-500">결제를 처리하고 있습니다...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">결제 실패</CardTitle>
            <CardDescription>{errorMessage}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild variant="outline">
              <Link href="/pricing">다시 시도하기</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            <span className="text-2xl">✓</span>
          </div>
          <CardTitle>이용권 충전 완료</CardTitle>
          <CardDescription>
            {creditsAdded > 0
              ? `${creditsAdded}회 이용권이 추가되었습니다. 현재 남은 생성 가능 횟수는 ${remainingCount}회입니다.`
              : `이미 반영된 결제입니다. 현재 남은 생성 가능 횟수는 ${remainingCount}회입니다.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button asChild>
            <Link href="/create">자소서 생성하러 가기</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">대시보드로 이동</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
