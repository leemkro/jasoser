"use client";

import { useState } from "react";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface TossBillingButtonProps {
  clientKey: string;
  userId: string;
  disabled?: boolean;
}

export function TossBillingButton({ clientKey, userId, disabled }: TossBillingButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const tossPayments = await loadTossPayments(clientKey);
      const payment = tossPayments.payment({ customerKey: userId });

      await payment.requestBillingAuth({
        method: "CARD",
        successUrl: `${window.location.origin}/billing/success`,
        failUrl: `${window.location.origin}/billing/fail`,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "결제 요청 중 오류가 발생했습니다.");
      setLoading(false);
    }
  }

  return (
    <Button className="h-12 w-full text-base" size="lg" onClick={handleClick} disabled={disabled || loading}>
      {loading ? <Spinner /> : null}
      프리미엄 구독하기
    </Button>
  );
}
