"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getFreeTrialRemaining, getTotalRemainingUsage } from "@/lib/usage";

interface UseUserState {
  user: User | null;
  credits: number;
  freeTrialRemaining: number;
  totalRemaining: number;
  loading: boolean;
}

export function useUser() {
  const [state, setState] = useState<UseUserState>({
    user: null,
    credits: 0,
    freeTrialRemaining: 0,
    totalRemaining: 0,
    loading: true,
  });

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const refresh = useCallback(async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      setState({
        user: null,
        credits: 0,
        freeTrialRemaining: 0,
        totalRemaining: 0,
        loading: false,
      });
      return;
    }

    const [{ data: profile }, generationCountResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("credits")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("generations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);

    const credits = Math.max(0, profile?.credits ?? 0);
    const generationCount = Math.max(0, generationCountResult.count ?? 0);
    const freeTrialRemaining = getFreeTrialRemaining(generationCount);
    const totalRemaining = getTotalRemainingUsage(credits, generationCount);

    setState({ user, credits, freeTrialRemaining, totalRemaining, loading: false });
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
