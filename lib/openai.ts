import { z } from "zod";

import { env } from "@/lib/env";
import type { GeneratedEssay, GenerationInput } from "@/lib/types";

const responseSchema = z.object({
  title: z.string(),
  sections: z
    .array(
      z.object({
        question: z.string(),
        answer: z.string(),
      }),
    )
    .min(1),
  overallTip: z.string().optional(),
});

function getMinimumAnswerLength(characterLimit: number) {
  return Math.max(150, Math.min(500, Math.floor(characterLimit * 0.4)));
}

function countChars(text: string) {
  return text.replace(/\s/g, "").length;
}

function normalizeResultShape(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") {
    return payload;
  }

  const obj = payload as Record<string, unknown>;
  const rawSections =
    obj.sections ??
    obj.items ??
    obj.answers ??
    obj["문항"] ??
    obj["문항들"] ??
    obj["sections"] ??
    obj["답변"];

  const toSection = (
    item: unknown,
    index: number,
  ): { question: string; answer: string } | null => {
    if (typeof item === "string") {
      const answer = item.trim();
      if (answer.length === 0) {
        return null;
      }
      return {
        question: `문항 ${index + 1}`,
        answer,
      };
    }

    if (!item || typeof item !== "object") {
      return null;
    }

    const section = item as Record<string, unknown>;
    const question =
      section.question ??
      section.title ??
      section.heading ??
      section["문항"] ??
      section["질문"] ??
      section["제목"] ??
      `문항 ${index + 1}`;
    const answer = section.answer ?? section.content ?? section.text ?? section["답변"] ?? section["내용"];

    if (typeof question !== "string" || typeof answer !== "string") {
      return null;
    }

    return {
      question: question.trim(),
      answer: answer.trim(),
    };
  };

  const sectionList = Array.isArray(rawSections)
    ? rawSections
    : rawSections && typeof rawSections === "object"
      ? Object.values(rawSections as Record<string, unknown>)
      : [];

  let sections = sectionList
    .map((item, index) => toSection(item, index))
    .filter((item): item is { question: string; answer: string } => item !== null);

  if (sections.length === 0) {
    const singleAnswer = obj.content ?? obj.text ?? obj.answer ?? obj["내용"] ?? obj["답변"];
    if (typeof singleAnswer === "string" && singleAnswer.trim().length > 0) {
      sections = [
        {
          question: "자기소개서 초안",
          answer: singleAnswer.trim(),
        },
      ];
    }
  }

  return {
    title:
      typeof obj.title === "string"
        ? obj.title
        : typeof obj["제목"] === "string"
          ? obj["제목"]
          : "자기소개서 초안",
    sections,
    overallTip:
      typeof obj.overallTip === "string"
        ? obj.overallTip
        : typeof obj["보완팁"] === "string"
          ? obj["보완팁"]
          : typeof obj["overall_tip"] === "string"
            ? obj["overall_tip"]
            : undefined,
  };
}

function buildPrompt(input: GenerationInput) {
  const naturalInstruction = input.makeNatural
    ? "문장 리듬을 조금 불규칙하게 하고, 개인적인 감정 표현을 자연스럽게 섞어 인간적인 문체를 강화해줘."
    : "문장 구조를 명확하게 유지하고, 채용담당자가 빠르게 읽을 수 있게 간결하게 작성해줘.";
  const minimumAnswerLength = getMinimumAnswerLength(input.characterLimit);

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
- 각 section.answer는 공백 제외 최소 ${minimumAnswerLength}자 이상으로 작성.
- 각 section.answer는 가능한 ${input.characterLimit}자에 최대한 가깝게 작성.
- 너무 짧은 요약형(3~5문장) 답변 금지.
- 허위 경력/과장 표현 금지.
- ${naturalInstruction}

JSON 스키마:
{
  "title": "string",
  "sections": [{ "question": "string", "answer": "string" }],
  "overallTip": "string"
}`;
}

const openAiResponseFormat = {
  type: "json_schema",
  json_schema: {
    name: "generated_essay",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        sections: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              question: { type: "string" },
              answer: { type: "string" },
            },
            required: ["question", "answer"],
          },
        },
        overallTip: { type: "string" },
      },
      required: ["title", "sections"],
    },
  },
} as const;

export async function generateEssay(input: GenerationInput): Promise<GeneratedEssay> {
  const maxRetries = 4;
  const minimumAnswerLength = getMinimumAnswerLength(input.characterLimit);
  const apiKey = env.openaiApiKey();
  const model = env.openaiModel();

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55000);

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                "항상 엄격하게 JSON만 반환하는 한국어 자소서 생성기. 친절한 설명 문구를 JSON 밖에 절대 출력하지 마라.",
            },
            { role: "user", content: buildPrompt(input) },
          ],
          temperature: 0.8,
          response_format: openAiResponseFormat,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        console.error(
          `OpenAI API error (attempt ${attempt + 1}):`,
          response.status,
          errorPayload?.error?.message ?? "Unknown error",
        );
        if (attempt < maxRetries - 1) continue;
        throw new Error(
          errorPayload?.error?.message
            ? `AI API 호출 실패(${response.status}): ${errorPayload.error.message}`
            : `AI API 호출 실패(${response.status})`,
        );
      }

      const payload = (await response.json()) as {
        choices?: Array<{
          message?: {
            content?: string | null;
          };
        }>;
      };
      const rawText = payload.choices?.[0]?.message?.content;

      if (!rawText || rawText.trim().length === 0) {
        console.error(`Empty response (attempt ${attempt + 1})`);
        if (attempt < maxRetries - 1) continue;
        throw new Error("AI 응답이 비어 있습니다.");
      }

      let content = rawText.trim();

      // Clean up
      content = content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
      content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        content = jsonMatch[0];
      }

      // Fix common JSON issues
      content = content
        .replace(/,\s*\.\.\.\s*(?=[\]}])/g, "")
        .replace(/\.\.\.\s*(?=[\]}])/g, "")
        .replace(/,\s*([\]}])/g, "$1")
        .replace(/[\x00-\x1F\x7F]/g, (ch) => ch === "\n" || ch === "\r" || ch === "\t" ? ch : "");

      const parsedJson = JSON.parse(content);
      const normalized = normalizeResultShape(parsedJson);
      const parsed = responseSchema.safeParse(normalized);
      if (!parsed.success) {
        console.error(
          `Attempt ${attempt + 1}: Invalid response schema`,
          JSON.stringify(parsed.error.issues),
          "\nRaw keys:", Object.keys(parsedJson),
          "\nNormalized:", JSON.stringify(normalized).slice(0, 500),
        );
        if (attempt < maxRetries - 1) continue;
        throw new Error("AI 응답 형식이 올바르지 않습니다.");
      }

      const hasShortSection = parsed.data.sections.some(
        (section) => countChars(section.answer) < minimumAnswerLength,
      );
      if (hasShortSection) {
        console.error(
          `Attempt ${attempt + 1}: Response too short (min ${minimumAnswerLength} chars per section)`,
        );
        if (attempt < maxRetries - 1) continue;
        throw new Error("생성 결과가 너무 짧습니다. 다시 시도해 주세요.");
      }

      return parsed.data;
    } catch (err) {
      clearTimeout(timeout);

      if (err instanceof DOMException && err.name === "AbortError") {
        if (attempt < maxRetries - 1) continue;
        throw new Error("요청 시간이 초과되었습니다.");
      }

      if (err instanceof TypeError) {
        if (attempt < maxRetries - 1) continue;
        throw new Error("OpenAI API 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      }

      if (attempt === maxRetries - 1) throw err;
      console.error(`Attempt ${attempt + 1} error:`, err instanceof Error ? err.message : String(err));
    }
  }

  throw new Error("AI 응답 생성에 실패했습니다. 다시 시도해주세요.");
}
