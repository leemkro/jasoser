"use client";

import { useCallback, useMemo, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { FREE_TRIAL_LIMIT, getTotalRemainingUsage } from "@/lib/usage";

const DEFAULT_REMAINING = FREE_TRIAL_LIMIT;

function getLocalRemainingKey(userId: string) {
  return `jasoseovibe:remaining:${userId}`;
}

function getLegacyLocalCreditsKey(userId: string) {
  return `jasoseovibe:credits:${userId}`;
}

function toNonNegative(value: string | null) {
  if (value === null) {
    return null;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return Math.max(0, parsed);
}

function readLocalRemaining(userId: string) {
  const nextRaw = toNonNegative(localStorage.getItem(getLocalRemainingKey(userId)));
  if (nextRaw !== null) {
    return nextRaw;
  }

  const legacyRaw = toNonNegative(localStorage.getItem(getLegacyLocalCreditsKey(userId)));
  if (legacyRaw !== null) {
    return legacyRaw;
  }

  return DEFAULT_REMAINING;
}

export function useSupabase(userId?: string | null) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [loading, setLoading] = useState(false);

  const getRemainingCount = useCallback(async () => {
    if (!userId) {
      return 0;
    }

    setLoading(true);
    try {
      const [{ data, error }, generationCountResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("credits")
          .eq("id", userId)
          .maybeSingle(),
        supabase
          .from("generations")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId),
      ]);

      if (error || generationCountResult.error) {
        return readLocalRemaining(userId);
      }

      const remaining = getTotalRemainingUsage(data?.credits ?? 0, generationCountResult.count ?? 0);
      localStorage.setItem(getLocalRemainingKey(userId), String(remaining));
      return remaining;
    } finally {
      setLoading(false);
    }
  }, [supabase, userId]);

  const incrementLocalFallback = useCallback(() => {
    if (!userId) {
      return;
    }

    const key = getLocalRemainingKey(userId);
    const current = readLocalRemaining(userId);
    localStorage.setItem(key, String(Math.max(0, current - 1)));
  }, [userId]);

  const syncLocalFromRemaining = useCallback(
    (remaining: number) => {
      if (!userId) {
        return;
      }

      localStorage.setItem(getLocalRemainingKey(userId), String(Math.max(0, remaining)));
    },
    [userId],
  );

  const getLocalRemainingCount = useCallback(() => {
    if (!userId) {
      return 0;
    }

    return readLocalRemaining(userId);
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
