"use client";

import { useEffect, useState } from "react";
import type { ActiveRestTimer } from "@/types/workout-ui";
import { formatSeconds } from "@/lib/utils";

export type FloatingRestTimerProps = {
  timer: ActiveRestTimer | null;
  onSkip: () => void;
  onDismiss: () => void;
};

export function FloatingRestTimer({ timer, onSkip, onDismiss }: FloatingRestTimerProps) {
  const [remaining, setRemaining] = useState(timer?.remainingSeconds ?? 0);

  useEffect(() => {
    if (!timer || remaining <= 0) return;
    const id = window.setInterval(() => {
      setRemaining((v) => Math.max(0, v - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [timer, remaining]);

  useEffect(() => {
    if (!timer || remaining > 0) return;
    onDismiss();
  }, [timer, remaining, onDismiss]);

  if (!timer) return null;

  return (
    <div className="fixed bottom-[calc(72px+env(safe-area-inset-bottom))] left-1/2 z-50 w-[calc(100%-24px)] max-w-[406px] -translate-x-1/2">
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/95 px-4 py-3 shadow-lg backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.08em] text-neutral-500">Rest timer</p>
            <p className="text-xl font-semibold tabular-nums text-neutral-50">{formatSeconds(remaining)}</p>
            <p className="truncate text-xs text-neutral-400">{timer.exerciseName || "Current exercise"}</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="h-9 rounded-full bg-neutral-100 px-3 text-sm font-medium text-neutral-950" onClick={onSkip}>
              Skip
            </button>
            <button className="h-9 rounded-full bg-neutral-800 px-3 text-sm text-neutral-300" onClick={onDismiss}>
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
