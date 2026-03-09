import { cn } from "@/lib/utils";

interface ProgressProps {
  className?: string;
}

export function Progress({ className }: ProgressProps) {
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-zinc-200", className)}
      role="progressbar"
      aria-label="생성 중"
    >
      <div className="h-full w-1/3 animate-[progress_1.5s_ease-in-out_infinite] rounded-full bg-zinc-900" />
    </div>
  );
}
