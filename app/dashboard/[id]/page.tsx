import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { GeneratedEssay } from "@/lib/types";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DashboardDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data } = await supabase
    .from("generations")
    .select("id, company, role, tone, created_at, output")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!data) {
    notFound();
  }

  const output = data.output as GeneratedEssay;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">
            {data.company} - {data.role}
          </h1>
          <p className="text-sm text-zinc-500">
            {new Date(data.created_at).toLocaleString("ko-KR", {
              timeZone: "Asia/Seoul",
            })}{" "}
            · 톤: {data.tone}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard">← 목록으로</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{output.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {output.sections.map((section, index) => (
            <div key={index} className="space-y-2">
              <h3 className="font-semibold text-zinc-900">
                {index + 1}. {section.question}
              </h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
                {section.answer}
              </p>
            </div>
          ))}
          {output.overallTip ? (
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
              <p className="font-medium">보완 팁</p>
              <p>{output.overallTip}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
