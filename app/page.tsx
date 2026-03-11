import { CreditCard, FileText, RefreshCw } from "lucide-react";

import { AuthPanel } from "@/components/auth-panel";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: FileText,
    title: "문항별 아코디언 결과",
    description: "문항마다 펼쳐보고 복사할 수 있어요.",
  },
  {
    icon: RefreshCw,
    title: "AI 자연스럽게 재생성",
    description: "한 번 더 클릭으로 문체를 다듬어요.",
  },
  {
    icon: CreditCard,
    title: "건수형 이용권 결제",
    description: "5회·15회·40회 이용권 중 선택 구매.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-[calc(100vh-10rem)] flex-col items-center justify-center gap-12 lg:flex-row lg:items-start lg:gap-16">
      <section className="flex max-w-lg flex-1 flex-col items-center text-center lg:items-start lg:text-left">
        <p className="mb-4 inline-block rounded-full border border-zinc-300 bg-white px-4 py-1.5 text-xs font-semibold tracking-wide text-zinc-600">
          AI 자기소개서 생성 플랫폼
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
          자소서바이브
        </h1>
        <p className="mt-2 text-xl font-medium text-zinc-500">
          한국 기업 맞춤 자소서 생성
        </p>
        <p className="mt-4 max-w-md text-base leading-relaxed text-zinc-600">
          기업명, 직무, 채용공고와 경험만 입력하면 문항별 초안을 빠르게 만듭니다.
          대시보드에서 히스토리를 관리하고, PDF로 바로 저장하세요.
        </p>
        {/* TODO: 히어로 CTA 버튼 영역 — 나중에 다시 활성화
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 lg:justify-start" />
        */}

        <div className="mt-10 grid w-full gap-3 sm:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="text-center lg:text-left">
              <CardContent className="flex flex-col items-center gap-2 p-5 lg:items-start">
                <feature.icon className="h-5 w-5 text-zinc-500" />
                <p className="text-sm font-semibold text-zinc-900">{feature.title}</p>
                <p className="text-xs leading-relaxed text-zinc-500">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="w-full max-w-md flex-shrink-0 lg:sticky lg:top-24">
        <AuthPanel />
      </section>
    </div>
  );
}
