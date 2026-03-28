"use client";

import type { ReactNode } from "react";
import { ExerciseList } from "@/components/workout/ExerciseList";
import { FloatingRestTimer } from "@/components/workout/FloatingRestTimer";
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
  nextSessionFocus?: string | null;
  activeRestTimer?: ActiveRestTimer | null;
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
  onSkipRestTimer: () => void;
  onDismissRestTimer: () => void;
  /** Shown directly under the title row (e.g. Start Workout) before meta + exercise list */
  startWorkoutSlot?: ReactNode;
};

export function WorkoutScreen({
  workoutName,
  elapsedSeconds,
  exercises,
  nextSessionFocus,
  activeRestTimer = null,
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
  onSkipRestTimer,
  onDismissRestTimer,
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
      </div>
      <FloatingRestTimer
        key={activeRestTimer?.startedAt ?? "no-timer"}
        timer={activeRestTimer}
        onSkip={onSkipRestTimer}
        onDismiss={onDismissRestTimer}
      />
    </main>
  );
}
