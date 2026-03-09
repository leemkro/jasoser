"use client";

import { useCallback, useMemo, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const FREE_DAILY_LIMIT = 3;

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getLocalUsageKey(userId: string) {
  return `jasoseovibe:usage:${userId}:${getTodayKey()}`;
}

export function useSupabase(userId?: string | null) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [loading, setLoading] = useState(false);

  const getRemainingCount = useCallback(async () => {
    if (!userId) {
      return FREE_DAILY_LIMIT;
    }

    setLoading(true);
    try {
      const today = getTodayKey();
      const { data, error } = await supabase
        .from("daily_usage")
        .select("used_count, limit_count")
        .eq("user_id", userId)
        .eq("usage_date", today)
        .eq("feature", "generation")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        // Query failure should not hard-block the user at 0.
        // Server-side /api/generate is the source of truth for quota enforcement.
        return FREE_DAILY_LIMIT;
      }

      if (!data) {
        return FREE_DAILY_LIMIT;
      }

      return Math.max(0, (data.limit_count ?? FREE_DAILY_LIMIT) - (data.used_count ?? 0));
    } finally {
      setLoading(false);
    }
  }, [supabase, userId]);

  const incrementLocalFallback = useCallback(() => {
    if (!userId) {
      return;
    }

    const key = getLocalUsageKey(userId);
    const current = Number(localStorage.getItem(key) ?? "0");
    localStorage.setItem(key, String(current + 1));
  }, [userId]);

  const syncLocalFromRemaining = useCallback(
    (remaining: number) => {
      if (!userId) {
        return;
      }

      const used = Math.max(0, FREE_DAILY_LIMIT - remaining);
      localStorage.setItem(getLocalUsageKey(userId), String(used));
    },
    [userId],
  );

  const getLocalRemainingCount = useCallback(() => {
    if (!userId) return FREE_DAILY_LIMIT;
    const localRaw = localStorage.getItem(getLocalUsageKey(userId));
    const localUsed = localRaw ? Number(localRaw) : 0;
    return Math.max(0, FREE_DAILY_LIMIT - localUsed);
  }, [userId]);

  return useMemo(
    () => ({
      loading,
      freeDailyLimit: FREE_DAILY_LIMIT,
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
