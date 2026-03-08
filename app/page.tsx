import Link from "next/link";

import { AuthPanel } from "@/components/auth-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section className="space-y-6">
        <p className="inline-block rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold tracking-wide text-zinc-700">
          AI 자기소개서 생성 플랫폼
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
          자소서바이브
          <span className="block text-zinc-500">한국 기업 맞춤 자소서 생성</span>
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-zinc-600">
          기업명, 직무, 채용공고와 경험만 입력하면 문항별 초안을 빠르게 만듭니다.
          대시보드에서 히스토리를 관리하고, PDF로 바로 저장하세요.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild size="lg">
            <Link href="/create">지금 자소서 만들기</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/pricing">프리미엄 보기</Link>
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            "문항별 아코디언 결과",
            "AI 자연스럽게 재생성",
            "Stripe 월 9,900원 구독",
          ].map((feature) => (
            <Card key={feature}>
              <CardContent className="p-4 text-sm text-zinc-600">{feature}</CardContent>
            </Card>
          ))}
        </div>
      </section>
      <section>
        <AuthPanel />
      </section>
    </div>
  );
}
