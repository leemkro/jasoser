"use client";

import { useState } from "react";
import { LogIn, Mail } from "lucide-react";
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
        const lower = error.message.toLowerCase();
        if (lower.includes("already") && lower.includes("registered")) {
          toast.error("이미 가입된 이메일입니다. 로그인해 주세요.");
          return;
        }
        toast.error(error.message);
        return;
      }

      const hasIdentity = (data.user?.identities?.length ?? 0) > 0;
      if (!data.session && data.user && !hasIdentity) {
        toast.error("이미 가입된 이메일입니다. 로그인해 주세요.");
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
    <Card className="w-full shadow-lg">
      <CardHeader className="space-y-1 pb-4 text-center">
        <CardTitle className="text-2xl">시작하기</CardTitle>
        <CardDescription>이메일 또는 구글로 10초 만에 시작하세요.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full gap-3 text-sm font-medium"
          onClick={signInWithGoogle}
          disabled={loading}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.44 1.18 4.93l3.66-2.84z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Google로 시작하기
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-zinc-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-3 text-zinc-400">또는 이메일로</span>
          </div>
        </div>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void signInWithPassword();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                id="email"
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="8자 이상"
            />
          </div>
          <Button type="submit" className="h-11 w-full" disabled={loading || !email || !password}>
            {loading ? <Spinner /> : <LogIn className="h-4 w-4" />}
            로그인
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-11 w-full text-zinc-500 hover:text-zinc-900"
            onClick={signUpWithPassword}
            disabled={loading || !email || !password}
          >
            계정이 없으신가요? <span className="font-semibold text-zinc-900">회원가입</span>
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
