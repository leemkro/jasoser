import { env } from "@/lib/env";

export const PORTONE_PREMIUM_PLAN = {
  amount: 4900,
  name: "자소서바이브 프리미엄",
  description: "월 4,900원 무제한 생성",
};

const PORTONE_API_BASE = "https://api.iamport.kr";

interface PortOneApiResponse<T> {
  code: number;
  message: string;
  response: T | null;
}

interface PortOneTokenPayload {
  access_token?: string;
}

interface PortOnePaymentPayload {
  imp_uid: string;
  merchant_uid: string;
  status: string;
  amount: number;
  paid_at: number | null;
}

export interface PortOnePayment {
  impUid: string;
  merchantUid: string;
  status: string;
  amount: number;
  paidAt: number | null;
}

async function readApiMessage(response: Response, fallbackMessage: string) {
  try {
    const payload = (await response.json()) as { message?: string };
    if (typeof payload.message === "string" && payload.message.trim().length > 0) {
      return payload.message;
    }
  } catch (error) {
    if (error instanceof Error) {
      return fallbackMessage;
    }

    return fallbackMessage;
  }

  return fallbackMessage;
}

async function getPortOneAccessToken() {
  const tokenResponse = await fetch(`${PORTONE_API_BASE}/users/getToken`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      imp_key: env.portoneApiKey(),
      imp_secret: env.portoneApiSecret(),
    }),
  });

  if (!tokenResponse.ok) {
    const message = await readApiMessage(tokenResponse, "포트원 인증 토큰 발급에 실패했습니다.");
    throw new Error(message);
  }

  const tokenPayload = (await tokenResponse.json()) as PortOneApiResponse<PortOneTokenPayload>;
  const accessToken = tokenPayload.response?.access_token;
  if (!accessToken) {
    throw new Error(tokenPayload.message || "포트원 인증 토큰 발급에 실패했습니다.");
  }

  return accessToken;
}

export async function getPortOnePayment(impUid: string): Promise<PortOnePayment> {
  const accessToken = await getPortOneAccessToken();
  const paymentResponse = await fetch(`${PORTONE_API_BASE}/payments/${encodeURIComponent(impUid)}`, {
    method: "GET",
    headers: {
      Authorization: accessToken,
      "Content-Type": "application/json",
    },
  });

  if (!paymentResponse.ok) {
    const message = await readApiMessage(paymentResponse, "포트원 결제 조회에 실패했습니다.");
    throw new Error(message);
  }

  const paymentPayload = (await paymentResponse.json()) as PortOneApiResponse<PortOnePaymentPayload>;
  const payment = paymentPayload.response;
  if (!payment) {
    throw new Error(paymentPayload.message || "결제 정보를 찾을 수 없습니다.");
  }

  return {
    impUid: payment.imp_uid,
    merchantUid: payment.merchant_uid,
    status: payment.status,
    amount: payment.amount,
    paidAt: payment.paid_at,
  };
}
