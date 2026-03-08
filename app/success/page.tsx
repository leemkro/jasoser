import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const params = await searchParams;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const sessionId = params.session_id;
  if (!sessionId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>결제 확인 중</CardTitle>
          <CardDescription>세션 정보가 없어 결제 상태를 확인할 수 없습니다.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  });

  const subscription = session.subscription;
  const subscriptionStatus =
    typeof subscription === "object" && subscription
      ? subscription.status
      : session.payment_status === "paid"
        ? "active"
        : "incomplete";

  await supabase.from("profiles").upsert({
    id: user.id,
    email: user.email,
    stripe_customer_id:
      typeof session.customer === "string" ? session.customer : session.customer?.id,
    stripe_subscription_id:
      typeof subscription === "string" ? subscription : subscription?.id,
    subscription_status: subscriptionStatus,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>결제가 완료되었습니다</CardTitle>
        <CardDescription>
          구독 상태: <strong>{subscriptionStatus}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/create">자소서 생성하러 가기</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">대시보드로 이동</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
