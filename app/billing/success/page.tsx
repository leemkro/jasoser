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

  useEffect(() => {
    const authKey = searchParams.get("authKey");
    const customerKey = searchParams.get("customerKey");

    if (!authKey || !customerKey) {
      setStatus("error");
      setErrorMessage("결제 인증 정보가 없습니다.");
      return;
    }

    async function confirm() {
      try {
        const response = await fetch("/api/toss/billing-key", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ authKey, customerKey }),
        });

        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(payload.error ?? "결제 처리에 실패했습니다.");
        }

        setStatus("success");
        toast.success("프리미엄 구독이 시작되었습니다!");
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
          <CardTitle>구독이 시작되었습니다!</CardTitle>
          <CardDescription>자소서바이브 프리미엄을 이용해 주셔서 감사합니다.</CardDescription>
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
