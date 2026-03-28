import { formatSeconds } from "@/lib/utils";

export type WorkoutMetaBarProps = {
  elapsedSeconds: number;
  exerciseCount: number;
  nextSessionFocus?: string | null;
};

export function WorkoutMetaBar({
  elapsedSeconds,
  exerciseCount,
  nextSessionFocus,
}: WorkoutMetaBarProps) {
  return (
    <div className="flex min-h-6 items-center gap-1.5 overflow-hidden text-[10px] text-neutral-600">
      <span className="tabular-nums">{formatSeconds(elapsedSeconds)}</span>
      <span>•</span>
      <span>{exerciseCount} exercises</span>
      {nextSessionFocus ? (
        <span className="ml-auto max-w-[52%] truncate whitespace-nowrap text-[10px] text-neutral-600">
          Focus: {nextSessionFocus}
        </span>
      ) : null}
    </div>
  );
}
