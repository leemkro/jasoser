"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface StripeCheckoutButtonProps {
  disabled?: boolean;
}

export function StripeCheckoutButton({ disabled }: StripeCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
      });

      const payload = (await response.json()) as {
        url?: string;
        error?: string;
      };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? "결제 세션 생성에 실패했습니다.");
      }

      window.location.href = payload.url;
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
