import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900",
        className,
      )}
      aria-label="로딩 중"
    />
  );
}
