import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { GenerationRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const [profileResult, generationResult] = await Promise.all([
    supabase.from("profiles").select("subscription_status").eq("id", user.id).single(),
    supabase
      .from("generations")
      .select("id, company, role, tone, created_at, output")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const subscriptionStatus = profileResult.data?.subscription_status ?? "free";
  const history = (generationResult.data ?? []) as GenerationRow[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">대시보드</h1>
          <p className="text-sm text-zinc-600">생성 기록과 구독 상태를 확인하세요.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={subscriptionStatus === "active" ? "success" : "secondary"}>
            {subscriptionStatus === "active" ? "프리미엄" : "무료"}
          </Badge>
          <Button asChild>
            <Link href="/create">새 자소서 만들기</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>생성 히스토리</CardTitle>
          <CardDescription>최근 30개의 생성 결과</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {history.length === 0 ? (
            <p className="text-sm text-zinc-500">아직 생성 기록이 없습니다.</p>
          ) : (
            history.map((row) => (
              <Link key={row.id} href={`/dashboard/${row.id}`} className="block rounded-md border border-zinc-200 p-4 transition-colors hover:border-zinc-400 hover:bg-zinc-50">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-zinc-900">
                    {row.company} - {row.role}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {new Date(row.created_at).toLocaleString("ko-KR")}
                  </p>
                </div>
                <p className="mt-1 text-sm text-zinc-600">톤: {row.tone}</p>
                <p className="mt-2 line-clamp-2 text-sm text-zinc-700">
                  {row.output?.sections?.[0]?.answer ?? "미리보기를 불러올 수 없습니다."}
                </p>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
