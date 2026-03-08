import { z } from "zod";

import { env } from "@/lib/env";
import type { GeneratedEssay, GenerationInput } from "@/lib/types";

interface GeminiErrorPayload {
  error?: {
    code?: number;
    message?: string;
    details?: Array<{
      "@type"?: string;
      retryDelay?: string;
    }>;
  };
}

const responseSchema = z.object({
  title: z.string(),
  sections: z.array(
    z.object({
      question: z.string(),
      answer: z.string(),
    }),
  ),
  overallTip: z.string().optional(),
});

function buildPrompt(input: GenerationInput) {
  const naturalInstruction = input.makeNatural
    ? "문장 리듬을 조금 불규칙하게 하고, 개인적인 감정 표현을 자연스럽게 섞어 인간적인 문체를 강화해줘."
    : "문장 구조를 명확하게 유지하고, 채용담당자가 빠르게 읽을 수 있게 간결하게 작성해줘.";

  return `너는 한국 취업 시장에 특화된 자소서 코치야.
아래 정보를 바탕으로 한국 기업 스타일의 자기소개서 초안을 JSON으로만 생성해.

[입력]
- 기업명: ${input.company}
- 직무: ${input.role}
- 채용공고: ${input.posting}
- 지원자 경험: ${input.experience}
- 톤: ${input.tone}
- 글자 수 제한: ${input.characterLimit}

[작성 규칙]
- 결과는 반드시 JSON 객체로만 반환.
- 문항별 sections 배열을 제공.
- 각 section.answer는 가능한 ${input.characterLimit}자 내외.
- 허위 경력/과장 표현 금지.
- ${naturalInstruction}

JSON 스키마:
{
  "title": "string",
  "sections": [{ "question": "string", "answer": "string" }],
  "overallTip": "string"
}`;
}

export async function generateEssay(input: GenerationInput): Promise<GeneratedEssay> {
  const model = env.geminiModel();
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
      env.geminiApiKey(),
    )}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: "항상 엄격하게 JSON만 반환하는 한국어 자소서 생성기. 친절한 설명 문구를 JSON 밖에 절대 출력하지 마라.",
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: buildPrompt(input) }],
          },
        ],
        generationConfig: {
          temperature: 0.85,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    let payload: GeminiErrorPayload | null = null;

    try {
      payload = JSON.parse(errorText) as GeminiErrorPayload;
    } catch {
      payload = null;
    }

    if (response.status === 429) {
      const retryInfo = payload?.error?.details?.find(
        (detail) => detail["@type"] === "type.googleapis.com/google.rpc.RetryInfo",
      );
      const retryDelay = retryInfo?.retryDelay;
      const retryHint = retryDelay ? ` 약 ${retryDelay} 후 다시 시도해 주세요.` : "";

      throw new Error(
        `Gemini API 할당량(Quota)을 초과했습니다. Google AI Studio에서 결제/요금제와 사용량을 확인해 주세요.${retryHint}`,
      );
    }

    const message = payload?.error?.message;
    throw new Error(
      message
        ? `Gemini API 호출 실패(${response.status}): ${message}`
        : `Gemini API 호출 실패(${response.status})`,
    );
  }

  const json = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const raw = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) {
    throw new Error("AI 응답이 비어 있습니다.");
  }

  const parsed = responseSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw new Error("AI 응답 형식이 올바르지 않습니다.");
  }

  return parsed.data;
}
