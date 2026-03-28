"use client";

import { useEffect, useRef } from "react";
import { useNumericEntry } from "@/hooks/useNumericEntry";
import type {
  ActiveRowTarget,
  CompleteSetInput,
  FocusTarget,
  UsePreviousInput,
  UpdateSetInput,
  WorkoutSetRowData,
} from "@/types/workout-ui";

export type SetRowProps = {
  exerciseId: string;
  set: WorkoutSetRowData;
  gridTemplate: string;
  isActive: boolean;
  focusTarget: FocusTarget;
  onUpdateSet: (input: UpdateSetInput) => void;
  onCompleteSet: (input: CompleteSetInput) => void;
  onUsePrevious: (input: UsePreviousInput) => void;
  onActiveRowChange: (target: ActiveRowTarget) => void;
};

export function SetRow({
  exerciseId,
  set,
  gridTemplate,
  isActive,
  focusTarget,
  onUpdateSet,
  onCompleteSet,
  onUsePrevious,
  onActiveRowChange,
}: SetRowProps) {
  void onUpdateSet;
  const rowRef = useRef<HTMLDivElement>(null);
  const { openReps, openWeight, isCellActive } = useNumericEntry();

  useEffect(() => {
    if (!focusTarget) return;
    if (focusTarget.exerciseId !== exerciseId || focusTarget.setId !== set.id) return;
    if (focusTarget.field === "actualReps") {
      openReps(exerciseId, set.id, set.actualReps);
    } else if (focusTarget.field === "actualWeight") {
      openWeight(exerciseId, set.id, set.actualWeight);
    }
    // Intentionally omit set.actualReps / set.actualWeight: only open when focus target changes,
    // not when values update from the keypad (avoids re-opening after commit).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTarget, exerciseId, set.id, openReps, openWeight]);

  const repsActive = isCellActive(exerciseId, set.id, "reps");
  const weightActive = isCellActive(exerciseId, set.id, "weight");

  return (
    <div
      ref={rowRef}
      className={`grid min-h-[52px] cursor-pointer items-center gap-1 border-t border-neutral-800/60 px-2 text-sm tabular-nums transition-colors duration-75 first:border-t-0 active:bg-neutral-800/40 scroll-mb-28 ${gridTemplate} ${set.completed ? "bg-neutral-100/10" : ""} ${isActive ? "bg-neutral-800/12" : ""}`}
      onClick={() => {
        onActiveRowChange({ exerciseId, setId: set.id });
        openReps(exerciseId, set.id, set.actualReps);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          onActiveRowChange({ exerciseId, setId: set.id });
          openReps(exerciseId, set.id, set.actualReps);
        }
      }}
    >
      <span className="text-center text-[12px] text-neutral-500">{set.setNumber}</span>
      {set.previousPerformance ? (
        <button
          className="h-8 w-full truncate rounded-sm px-1 text-left text-[10px] text-neutral-700/80 active:bg-neutral-800/30"
          onClick={(e) => {
            e.stopPropagation();
            onActiveRowChange({ exerciseId, setId: set.id });
            onUsePrevious({
              exerciseId,
              setId: set.id,
              weight: set.previousPerformance?.weight ?? null,
              reps: set.previousPerformance?.reps ?? null,
            });
          }}
          aria-label="Use previous set values"
        >
          {set.previousPerformance.label}
        </button>
      ) : (
        <span className="truncate text-[10px] text-neutral-700/80">
          {set.previousLabel ?? `${set.targetWeight ?? "-"}x${set.targetReps ?? "-"}`}
        </span>
      )}
      <div className="flex justify-end">
        <input
          type="text"
          readOnly
          tabIndex={-1}
          inputMode="none"
          autoComplete="off"
          value={set.actualWeight ?? ""}
          placeholder="lb"
          className={`h-9 w-full max-w-[88px] cursor-pointer rounded border-0 bg-transparent px-1.5 text-right text-base text-neutral-100 outline-none focus:bg-neutral-800/35 ${weightActive ? "ring-1 ring-inset ring-white/70" : ""}`}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onActiveRowChange({ exerciseId, setId: set.id });
            openWeight(exerciseId, set.id, set.actualWeight);
          }}
          onClick={(e) => e.stopPropagation()}
          aria-label="Weight"
        />
      </div>
      <div className="flex justify-end">
        <input
          type="text"
          readOnly
          tabIndex={-1}
          inputMode="none"
          autoComplete="off"
          value={set.actualReps ?? ""}
          placeholder="reps"
          className={`h-9 w-full max-w-[60px] cursor-pointer rounded border-0 bg-transparent px-1.5 text-right text-base text-neutral-100 outline-none focus:bg-neutral-800/35 ${repsActive ? "ring-1 ring-inset ring-white/70" : ""}`}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onActiveRowChange({ exerciseId, setId: set.id });
            openReps(exerciseId, set.id, set.actualReps);
          }}
          onClick={(e) => e.stopPropagation()}
          aria-label="Reps"
        />
      </div>
      <button
        className={`group flex h-8 w-8 items-center justify-center rounded-md border transition-colors duration-75 transition-transform active:scale-[0.97] ${
          set.completed
            ? "border-neutral-200 bg-neutral-100 text-neutral-900"
            : "border-neutral-600/80 bg-neutral-900/40 text-transparent active:border-neutral-500 active:bg-neutral-800/50"
        }`}
        onPointerDown={(e) => e.preventDefault()}
        onClick={(e) => {
          e.stopPropagation();
          onActiveRowChange({ exerciseId, setId: set.id });
          const nextCompleted = !set.completed;
          onCompleteSet({ exerciseId, setId: set.id, completed: nextCompleted });
        }}
        aria-label={set.completed ? "Mark set incomplete" : "Mark set complete"}
      >
        <svg
          viewBox="0 0 24 24"
          className={`h-4 w-4 ${set.completed ? "opacity-100" : "opacity-0"}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </button>
    </div>
  );
}
