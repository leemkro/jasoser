import { z } from "zod";

import type { GeneratedEssay, GenerationInput } from "@/lib/types";
import { env } from "@/lib/env";

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
  const maxRetries = 3;
  const apiKey = env.geminiApiKey();
  const model = env.geminiModel();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const systemInstruction =
    "항상 엄격하게 JSON만 반환하는 한국어 자소서 생성기. 친절한 설명 문구를 JSON 밖에 절대 출력하지 마라.";

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55000);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstruction }],
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
          temperature: 0.85,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        console.error(`Gemini API error (attempt ${attempt + 1}):`, response.status);
        if (attempt < maxRetries - 1) continue;
        throw new Error(`AI API 호출 실패(${response.status})`);
      }

      const responseJson = (await response.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string }>;
          };
        }>;
      };
      const rawText =
        responseJson.candidates?.[0]?.content?.parts
          ?.map((part) => part.text ?? "")
          .join("")
          .trim() ?? "";

      if (!rawText || rawText.trim().length === 0) {
        console.error(`Empty response (attempt ${attempt + 1})`);
        if (attempt < maxRetries - 1) continue;
        throw new Error("AI 응답이 비어 있습니다.");
      }

      let content = rawText.trim();

      // If response is a message wrapper, extract the content field
      try {
        const wrapper = JSON.parse(content) as { role?: string; content?: string };
        if (wrapper.role === "assistant" && typeof wrapper.content === "string") {
          content = wrapper.content.trim();
        }
      } catch {
        // Not a JSON wrapper, continue processing
      }

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
        .replace(/\/\/.*/g, "")
        .replace(/,\s*([\]}])/g, "$1")
        .replace(/[\x00-\x1F\x7F]/g, (ch) => ch === "\n" || ch === "\r" || ch === "\t" ? ch : "");

      const parsed = responseSchema.safeParse(JSON.parse(content));
      if (!parsed.success) {
        console.error(`Attempt ${attempt + 1}: Invalid response schema`);
        if (attempt < maxRetries - 1) continue;
        throw new Error("AI 응답 형식이 올바르지 않습니다.");
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
        throw new Error("AI 서비스 연결에 실패했습니다. 잠시 후 다시 시도해주세요.");
      }

      if (attempt === maxRetries - 1) throw err;
      console.error(`Attempt ${attempt + 1} error:`, err instanceof Error ? err.message : String(err));
    }
  }

  throw new Error("AI 응답 생성에 실패했습니다. 다시 시도해주세요.");
}
