"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

interface UseUserState {
  user: User | null;
  isPremium: boolean;
  loading: boolean;
}

export function useUser() {
  const [state, setState] = useState<UseUserState>({
    user: null,
    isPremium: false,
    loading: true,
  });

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const refresh = useCallback(async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      setState({ user: null, isPremium: false, loading: false });
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_status")
      .eq("id", user.id)
      .single();

    const isPremium = ["active", "trialing"].includes(
      profile?.subscription_status ?? "free",
    );

    setState({ user, isPremium, loading: false });
  }, [supabase]);

  useEffect(() => {
    void refresh();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });

    return () => subscription.unsubscribe();
  }, [refresh, supabase.auth]);

  return {
    ...state,
    refresh,
  };
}
