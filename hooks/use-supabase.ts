"use client";

import { useCallback, useMemo, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const DEFAULT_CREDITS = 0;

function getLocalCreditsKey(userId: string) {
  return `jasoseovibe:credits:${userId}`;
}

export function useSupabase(userId?: string | null) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [loading, setLoading] = useState(false);

  const getRemainingCount = useCallback(async () => {
    if (!userId) {
      return DEFAULT_CREDITS;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        const localRaw = localStorage.getItem(getLocalCreditsKey(userId));
        return Math.max(0, localRaw ? Number(localRaw) : DEFAULT_CREDITS);
      }

      return Math.max(0, data?.credits ?? DEFAULT_CREDITS);
    } finally {
      setLoading(false);
    }
  }, [supabase, userId]);

  const incrementLocalFallback = useCallback(() => {
    if (!userId) {
      return;
    }

    const key = getLocalCreditsKey(userId);
    const current = Number(localStorage.getItem(key) ?? String(DEFAULT_CREDITS));
    localStorage.setItem(key, String(Math.max(0, current - 1)));
  }, [userId]);

  const syncLocalFromRemaining = useCallback(
    (remaining: number) => {
      if (!userId) {
        return;
      }

      localStorage.setItem(getLocalCreditsKey(userId), String(Math.max(0, remaining)));
    },
    [userId],
  );

  const getLocalRemainingCount = useCallback(() => {
    if (!userId) {
      return DEFAULT_CREDITS;
    }

    const localRaw = localStorage.getItem(getLocalCreditsKey(userId));
    return Math.max(0, localRaw ? Number(localRaw) : DEFAULT_CREDITS);
  }, [userId]);

  return useMemo(
    () => ({
      loading,
      getRemainingCount,
      getLocalRemainingCount,
      incrementLocalFallback,
      syncLocalFromRemaining,
    }),
    [
      loading,
      getRemainingCount,
      getLocalRemainingCount,
      incrementLocalFallback,
      syncLocalFromRemaining,
    ],
  );
}
