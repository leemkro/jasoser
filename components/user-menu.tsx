"use client";

import { toast } from "sonner";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";

export function UserMenu({ email }: { email?: string | null }) {
  const supabase = createSupabaseBrowserClient();

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
      return;
    }
    window.location.href = "/";
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="hidden text-zinc-600 sm:inline">{email}</span>
      <Button variant="outline" size="sm" onClick={handleSignOut}>
        로그아웃
      </Button>
    </div>
  );
}
