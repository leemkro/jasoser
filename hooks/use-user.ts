"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

interface UseUserState {
  user: User | null;
  credits: number;
  loading: boolean;
}

export function useUser() {
  const [state, setState] = useState<UseUserState>({
    user: null,
    credits: 0,
    loading: true,
  });

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const refresh = useCallback(async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      setState({ user: null, credits: 0, loading: false });
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", user.id)
      .maybeSingle();

    setState({ user, credits: profile?.credits ?? 0, loading: false });
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
