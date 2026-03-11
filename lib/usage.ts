export const FREE_TRIAL_LIMIT = 3;

function toNonNegativeInteger(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

export function getFreeTrialRemaining(totalUsageCount: number | null | undefined) {
  const safeUsed = Math.min(FREE_TRIAL_LIMIT, toNonNegativeInteger(totalUsageCount));
  return Math.max(0, FREE_TRIAL_LIMIT - safeUsed);
}

export function getTotalRemainingUsage(
  credits: number | null | undefined,
  totalUsageCount: number | null | undefined,
) {
  return toNonNegativeInteger(credits) + getFreeTrialRemaining(totalUsageCount);
}
