import { env } from "@/lib/env";

// 토스페이먼츠 정기결제 플랜
export const PREMIUM_PLAN = {
  amount: 4900,
  name: "자소서바이브 프리미엄",
  description: "월 4,900원 무제한 생성",
};

// 크레딧 상품
export const CREDIT_PACKAGE = {
  amount: 4900,
  credits: 10,
  name: "크레딧 10회",
};

// 토스페이먼츠 API base URL
const TOSS_API_BASE = "https://api.tosspayments.com/v1";

// Authorization 헤더 생성 (Basic auth with secretKey)
function authHeader() {
  const encoded = Buffer.from(`${env.tossSecretKey()}:`).toString("base64");
  return `Basic ${encoded}`;
}

// 빌링키 발급 (authKey로 billingKey 교환)
export async function issueBillingKey(authKey: string, customerKey: string) {
  const response = await fetch(`${TOSS_API_BASE}/billing/authorizations/issue`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ authKey, customerKey }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message ?? "빌링키 발급에 실패했습니다.");
  }

  return response.json() as Promise<{
    billingKey: string;
    customerKey: string;
    cardCompany: string;
    cardNumber: string;
    method: string;
  }>;
}

// 빌링키로 정기결제 실행
export async function chargeBilling(billingKey: string, customerKey: string, orderId: string) {
  const response = await fetch(`${TOSS_API_BASE}/billing/${billingKey}`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      customerKey,
      amount: PREMIUM_PLAN.amount,
      orderId,
      orderName: PREMIUM_PLAN.name,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message ?? "결제에 실패했습니다.");
  }

  return response.json() as Promise<{
    paymentKey: string;
    orderId: string;
    status: string;
    approvedAt: string;
  }>;
}
