import type { RepRange } from "@/types/workout-ui";

export type ExerciseHeaderProps = {
  exerciseId: string;
  name: string;
  repRange: RepRange;
  lastPerformance?: string | null;
  onOpenHistory?: (exerciseId: string) => void;
  onOpenNotes?: (exerciseId: string) => void;
};

export function ExerciseHeader({
  exerciseId,
  name,
  repRange,
  lastPerformance,
  onOpenHistory,
  onOpenNotes,
}: ExerciseHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[16px] font-semibold leading-5 text-neutral-50">
          {name}
        </h3>
        <p className="mt-0.5 text-[12px] font-medium tabular-nums text-neutral-300">
          {repRange.min}-{repRange.max}
        </p>
        {lastPerformance ? (
          <p className="mt-0.5 truncate text-[10px] leading-4 text-neutral-700">
            {lastPerformance}
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-1">
        {onOpenHistory ? (
          <button
            className="flex h-6 w-6 items-center justify-center rounded text-neutral-600 active:bg-neutral-800/50"
            onClick={() => onOpenHistory(exerciseId)}
            aria-label="Open exercise history"
          >
            H
          </button>
        ) : null}
        {onOpenNotes ? (
          <button
            className="flex h-6 w-6 items-center justify-center rounded text-neutral-600 active:bg-neutral-800/50"
            onClick={() => onOpenNotes(exerciseId)}
            aria-label="Open exercise notes"
          >
            N
          </button>
        ) : null}
      </div>
    </div>
  );
}
