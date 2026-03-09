"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function BillingFailPage() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const message = searchParams.get("message");

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-red-600">결제 실패</CardTitle>
          <CardDescription>
            {message ?? "결제 처리 중 문제가 발생했습니다."}
            {code ? <span className="mt-1 block text-xs text-zinc-400">오류 코드: {code}</span> : null}
          </CardDescription>
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
