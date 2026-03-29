"use client";

import type { ReactNode } from "react";
import { ExerciseList } from "@/components/workout/ExerciseList";
import { WorkoutHeader } from "@/components/workout/WorkoutHeader";
import { WorkoutMetaBar } from "@/components/workout/WorkoutMetaBar";
import { todayLayout } from "@/components/workout/today-layout";
import type {
  ActiveRestTimer,
  ActiveRowTarget,
  CompleteSetInput,
  ExerciseCardData,
  FocusTarget,
  UsePreviousInput,
  UpdateSetInput,
} from "@/types/workout-ui";

export type WorkoutScreenProps = {
  workoutId: string;
  workoutName: string;
  startedAt: string;
  elapsedSeconds: number;
  exercises: ExerciseCardData[];
  /** Inline rest countdown under the completed set row (single active timer). */
  inlineRestTimer: ActiveRestTimer | null;
  nextSessionFocus?: string | null;
  isFinishing?: boolean;
  /** When false, Finish is disabled until a workout session exists (see Today page). */
  canFinish?: boolean;
  onBack?: () => void;
  onFinishWorkout: () => void;
  onOpenWorkoutOptions?: () => void;
  onUpdateSet: (input: UpdateSetInput) => void;
  onCompleteSet: (input: CompleteSetInput) => void;
  onUsePrevious: (input: UsePreviousInput) => void;
  onAddSet: (exerciseId: string) => void;
  onRemoveLastSet: (exerciseId: string) => void;
  activeRow: ActiveRowTarget;
  focusTarget: FocusTarget;
  onActiveRowChange: (target: ActiveRowTarget) => void;
  onOpenExerciseHistory?: (exerciseId: string) => void;
  onOpenExerciseNotes?: (exerciseId: string) => void;
  /** Shown directly under the title row (e.g. Start Workout) before meta + exercise list */
  startWorkoutSlot?: ReactNode;
};

export function WorkoutScreen({
  workoutName,
  elapsedSeconds,
  exercises,
  inlineRestTimer,
  nextSessionFocus,
  isFinishing = false,
  canFinish = true,
  onBack,
  onFinishWorkout,
  onOpenWorkoutOptions,
  onUpdateSet,
  onCompleteSet,
  onUsePrevious,
  onAddSet,
  onRemoveLastSet,
  activeRow,
  focusTarget,
  onActiveRowChange,
  onOpenExerciseHistory,
  onOpenExerciseNotes,
  startWorkoutSlot,
}: WorkoutScreenProps) {
  return (
    <main className={todayLayout.screen}>
      <div className={todayLayout.sectionStack}>
        <WorkoutHeader
          workoutName={workoutName}
          elapsedSeconds={elapsedSeconds}
          isFinishing={isFinishing}
          canFinish={canFinish}
          onBack={onBack}
          onFinishWorkout={onFinishWorkout}
          onOpenWorkoutOptions={onOpenWorkoutOptions}
        />
        {startWorkoutSlot ? (
          <div className="w-full shrink-0 px-0 pt-0.5">{startWorkoutSlot}</div>
        ) : null}
        <WorkoutMetaBar
          elapsedSeconds={elapsedSeconds}
          exerciseCount={exercises.length}
          nextSessionFocus={nextSessionFocus}
        />
        <ExerciseList
          exercises={exercises}
          inlineRestTimer={inlineRestTimer}
          onUpdateSet={onUpdateSet}
          onCompleteSet={onCompleteSet}
          onUsePrevious={onUsePrevious}
          onAddSet={onAddSet}
          onRemoveLastSet={onRemoveLastSet}
          activeRow={activeRow}
          focusTarget={focusTarget}
          onActiveRowChange={onActiveRowChange}
          onOpenExerciseHistory={onOpenExerciseHistory}
          onOpenExerciseNotes={onOpenExerciseNotes}
        />
        <div className="mt-5 w-full shrink-0 pb-1">
          <button
            type="button"
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-neutral-100 text-base font-semibold text-neutral-950 shadow-sm active:bg-neutral-200/90 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isFinishing || !canFinish}
            onClick={onFinishWorkout}
          >
            {isFinishing ? "Saving…" : "Finish Workout"}
          </button>
        </div>
      </div>
    </main>
  );
}
