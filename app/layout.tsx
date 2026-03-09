import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";

import { UserMenu } from "@/components/user-menu";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "자소서바이브 | AI 자소서 생성기",
  description: "한국 취업 시장에 맞춘 AI 자소서 생성 웹앱",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="min-h-screen bg-zinc-50">
          <header className="border-b border-zinc-200 bg-white/80 backdrop-blur">
            <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
              <Link href={user ? "/create" : "/"} className="text-lg font-semibold text-zinc-900">
                자소서바이브
              </Link>
              <nav className="flex items-center gap-2 sm:gap-4">
                {user ? (
                  <>
                    <Link href="/create" className="text-sm text-zinc-600 hover:text-zinc-900">
                      생성하기
                    </Link>
                    <Link href="/dashboard" className="text-sm text-zinc-600 hover:text-zinc-900">
                      대시보드
                    </Link>
                  </>
                ) : null}
                {/* TODO: 요금제 링크 — 나중에 다시 활성화
                <Link href="/pricing" className="text-sm text-zinc-600 hover:text-zinc-900">
                  요금제
                </Link>
                */}
                {user ? <UserMenu email={user.email} /> : null}
              </nav>
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">{children}</main>
        </div>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
