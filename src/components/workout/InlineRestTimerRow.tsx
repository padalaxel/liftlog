"use client";

import { formatSeconds } from "@/lib/utils";

export type InlineRestTimerRowProps = {
  exerciseId: string;
  setId: string;
  remainingSeconds: number;
  durationSeconds: number;
  isUrgent: boolean;
};

/**
 * Compact rest countdown inline under the set row that started it (Strong-like table integration).
 */
export function InlineRestTimerRow(props: InlineRestTimerRowProps) {
  const { remainingSeconds, durationSeconds, isUrgent } = props;
  return (
    <div
      className="pointer-events-none flex h-8 select-none items-center justify-center gap-2.5 border-t border-neutral-800/55 bg-neutral-950/25 px-2"
      role="status"
      aria-live="polite"
      aria-label={`Rest ${formatSeconds(remainingSeconds)} of ${formatSeconds(durationSeconds)}`}
    >
      <span className="h-px min-w-[24px] flex-1 bg-neutral-700/45" aria-hidden />
      <span
        className={`text-[13px] font-medium tabular-nums tracking-tight ${
          isUrgent ? "text-red-400" : "text-blue-400"
        }`}
      >
        {formatSeconds(remainingSeconds)} remaining
      </span>
      <span className="h-px min-w-[24px] flex-1 bg-neutral-700/45" aria-hidden />
    </div>
  );
}
