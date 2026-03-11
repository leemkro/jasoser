"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface PortoneBillingButtonProps {
  storeId: string;
  pgProvider?: string;
  userId: string;
  userEmail?: string;
  disabled?: boolean;
}

interface PortOneRequestPayParams {
  pg?: string;
  pay_method: "card";
  merchant_uid: string;
  name: string;
  amount: number;
  buyer_email?: string;
  m_redirect_url: string;
}

interface PortOneRequestPayResponse {
  imp_uid?: string;
  merchant_uid?: string;
  error_code?: string;
  error_msg?: string;
}

interface PortOneBrowserClient {
  init: (storeId: string) => void;
  request_pay: (
    params: PortOneRequestPayParams,
    callback: (response: PortOneRequestPayResponse) => void,
  ) => void;
}

declare global {
  interface Window {
    IMP?: PortOneBrowserClient;
  }
}

const PREMIUM_PLAN = {
  amount: 4900,
  name: "자소서바이브 프리미엄",
};

function loadPortOneScript() {
  return new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("브라우저 환경에서만 결제를 진행할 수 있습니다."));
      return;
    }

    if (window.IMP) {
      resolve();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>("script[data-portone-sdk='true']");
    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
        return;
      }

      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("포트원 SDK 로드에 실패했습니다.")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.iamport.kr/v1/iamport.js";
    script.async = true;
    script.dataset.portoneSdk = "true";
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error("포트원 SDK 로드에 실패했습니다."));
    document.head.appendChild(script);
  });
}

export function PortoneBillingButton({
  storeId,
  pgProvider,
  userId,
  userEmail,
  disabled,
}: PortoneBillingButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);

    try {
      await loadPortOneScript();
      const portOne = window.IMP;

      if (!portOne) {
        throw new Error("포트원 SDK가 초기화되지 않았습니다.");
      }

      const merchantUid = `sub_${userId}_${Date.now()}`;
      const successUrl = `${window.location.origin}/billing/success`;
      const failUrl = `${window.location.origin}/billing/fail`;

      portOne.init(storeId);
      portOne.request_pay(
        {
          ...(pgProvider ? { pg: pgProvider } : {}),
          pay_method: "card",
          merchant_uid: merchantUid,
          name: PREMIUM_PLAN.name,
          amount: PREMIUM_PLAN.amount,
          buyer_email: userEmail,
          m_redirect_url: successUrl,
        },
        (response) => {
          if (response.imp_uid && response.merchant_uid) {
            const url = new URL(successUrl);
            url.searchParams.set("imp_uid", response.imp_uid);
            url.searchParams.set("merchant_uid", response.merchant_uid);
            window.location.href = url.toString();
            return;
          }

          const url = new URL(failUrl);
          if (response.error_code) {
            url.searchParams.set("code", response.error_code);
          }
          if (response.error_msg) {
            url.searchParams.set("message", response.error_msg);
          }
          window.location.href = url.toString();
        },
      );
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
