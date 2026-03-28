"use client";

import { useEffect, useRef } from "react";
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
  autoFocus?: boolean;
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
  autoFocus = false,
  onUpdateSet,
  onCompleteSet,
  onUsePrevious,
  onActiveRowChange,
}: SetRowProps) {
  const repsInputRef = useRef<HTMLInputElement>(null);
  const weightInputRef = useRef<HTMLInputElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!focusTarget) return;
    if (focusTarget.exerciseId !== exerciseId || focusTarget.setId !== set.id) return;
    const targetRef = focusTarget.field === "actualWeight" ? weightInputRef : repsInputRef;
    targetRef.current?.focus();
    targetRef.current?.select();
    const rowRect = rowRef.current?.getBoundingClientRect();
    if (!rowRect) return;
    const topCutoff = 56;
    const bottomCutoff = window.innerHeight - 200;
    if (rowRect.top < topCutoff || rowRect.bottom > bottomCutoff) {
      rowRef.current?.scrollIntoView({ block: "nearest", behavior: "auto" });
    }
  }, [exerciseId, focusTarget, set.id]);

  function parseNumericValue(value: string): number | null {
    const digitsOnly = value.replace(/[^\d]/g, "");
    if (!digitsOnly) return null;
    return Number(digitsOnly);
  }

  return (
    <div
      ref={rowRef}
      className={`grid h-[50px] cursor-pointer items-center gap-1 border-t border-neutral-800/60 px-2 text-sm tabular-nums transition-colors duration-75 first:border-t-0 active:bg-neutral-800/40 scroll-mb-28 ${gridTemplate} ${set.completed ? "bg-neutral-100/10" : ""} ${isActive ? "bg-neutral-800/12" : ""}`}
      onClick={() => {
        if (document.activeElement === repsInputRef.current) return;
        onActiveRowChange({ exerciseId, setId: set.id });
        repsInputRef.current?.focus();
        repsInputRef.current?.select();
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") repsInputRef.current?.focus();
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
          inputMode="numeric"
          pattern="[0-9]*"
          value={set.actualWeight ?? ""}
          placeholder="lb"
          className="h-8 w-full max-w-[84px] rounded border-0 bg-transparent px-1.5 text-right text-sm text-neutral-100 outline-none focus:bg-neutral-800/35"
          ref={weightInputRef}
          onClick={(e) => e.stopPropagation()}
          onFocus={() => onActiveRowChange({ exerciseId, setId: set.id })}
          onChange={(e) =>
            onUpdateSet({
              exerciseId,
              setId: set.id,
              field: "actualWeight",
              value: parseNumericValue(e.target.value),
            })}
        />
      </div>
      <div className="flex justify-end">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={set.actualReps ?? ""}
          placeholder="reps"
          className="h-8 w-full max-w-[56px] rounded border-0 bg-transparent px-1.5 text-right text-sm text-neutral-100 outline-none focus:bg-neutral-800/35"
          ref={repsInputRef}
          autoFocus={autoFocus}
          onClick={(e) => e.stopPropagation()}
          onFocus={() => onActiveRowChange({ exerciseId, setId: set.id })}
          onChange={(e) =>
            onUpdateSet({
              exerciseId,
              setId: set.id,
              field: "actualReps",
              value: parseNumericValue(e.target.value),
            })}
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
