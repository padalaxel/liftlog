"use client";

import { formatSeconds } from "@/lib/utils";

export type WorkoutHeaderProps = {
  workoutName: string;
  elapsedSeconds: number;
  isFinishing?: boolean;
  onBack?: () => void;
  onFinishWorkout: () => void;
  onOpenWorkoutOptions?: () => void;
};

export function WorkoutHeader({
  workoutName,
  elapsedSeconds,
  isFinishing = false,
  onBack,
  onFinishWorkout,
  onOpenWorkoutOptions,
}: WorkoutHeaderProps) {
  return (
    <header className="h-12">
      <div className="flex h-full items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {onBack ? (
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 active:bg-neutral-800/60"
              onClick={onBack}
            >
              {"<"}
            </button>
          ) : null}
          <div className="min-w-0">
            <p className="truncate text-[18px] font-semibold leading-5 text-neutral-50">
              {workoutName}
            </p>
            <p className="mt-0.5 text-[11px] tabular-nums text-neutral-500">
              {formatSeconds(elapsedSeconds)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onOpenWorkoutOptions ? (
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 active:bg-neutral-800/60"
              onClick={onOpenWorkoutOptions}
            >
              ...
            </button>
          ) : null}
          <button
            className="h-8 rounded-full border border-neutral-700 bg-neutral-900 px-3 text-xs font-medium text-neutral-200 disabled:opacity-50"
            disabled={isFinishing}
            onClick={onFinishWorkout}
          >
            {isFinishing ? "..." : "Finish"}
          </button>
        </div>
      </div>
    </header>
  );
}
