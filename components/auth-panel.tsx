"use client";

import { useState } from "react";
import { LogIn } from "lucide-react";
import { toast } from "sonner";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

export function AuthPanel() {
  const supabase = createSupabaseBrowserClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function signInWithPassword() {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.toLowerCase().includes("email not confirmed")) {
          toast.error("이메일 인증이 필요합니다. 메일함에서 인증 링크를 눌러주세요.");
          return;
        }
        toast.error(error.message);
        return;
      }
      toast.success("로그인되었습니다.");
      window.location.href = "/dashboard";
    } finally {
      setLoading(false);
    }
  }

  async function signUpWithPassword() {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      if (data.session) {
        toast.success("회원가입 및 로그인 완료.");
        window.location.href = "/dashboard";
        return;
      }

      toast.success("회원가입 완료. 메일함의 인증 링크를 클릭한 뒤 로그인하세요.");
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        toast.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>로그인 / 회원가입</CardTitle>
        <CardDescription>이메일 또는 구글로 10초 만에 시작하세요.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void signInWithPassword();
          }}
        >
        <div className="space-y-2">
          <Label htmlFor="email">이메일</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">비밀번호</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="8자 이상"
          />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button type="submit" disabled={loading || !email || !password}>
            {loading ? <Spinner /> : <LogIn className="h-4 w-4" />} 로그인
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={signUpWithPassword}
            disabled={loading || !email || !password}
          >
            회원가입
          </Button>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={signInWithGoogle}
          disabled={loading}
        >
          Google로 시작하기
        </Button>
        </form>
      </CardContent>
    </Card>
  );
}
