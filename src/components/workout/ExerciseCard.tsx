"use client";

import { ExerciseFooterActions } from "@/components/workout/ExerciseFooterActions";
import { ExerciseHeader } from "@/components/workout/ExerciseHeader";
import { ExerciseSubline } from "@/components/workout/ExerciseSubline";
import { SetTable } from "@/components/workout/SetTable";
import { todayLayout } from "@/components/workout/today-layout";
import type {
  ActiveRowTarget,
  CompleteSetInput,
  ExerciseCardData,
  FocusTarget,
  UsePreviousInput,
  UpdateSetInput,
} from "@/types/workout-ui";

export type ExerciseCardProps = {
  exercise: ExerciseCardData;
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
};

export function ExerciseCard({
  exercise,
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
}: ExerciseCardProps) {
  return (
    <section className={`${todayLayout.card} flex flex-col gap-1.5`}>
      <ExerciseHeader
        exerciseId={exercise.id}
        name={exercise.name}
        repRange={exercise.repRange}
        lastPerformance={exercise.lastPerformance}
        onOpenHistory={onOpenExerciseHistory}
        onOpenNotes={onOpenExerciseNotes}
      />
      <ExerciseSubline
        cueText={exercise.cueText}
        progressionHint={exercise.progressionHint}
        restSeconds={exercise.restSeconds}
      />
      <SetTable
        exerciseId={exercise.id}
        sets={exercise.sets}
        onUpdateSet={onUpdateSet}
        onCompleteSet={onCompleteSet}
        onUsePrevious={onUsePrevious}
        onAddSet={onAddSet}
        onRemoveLastSet={onRemoveLastSet}
        activeRow={activeRow}
        focusTarget={focusTarget}
        onActiveRowChange={onActiveRowChange}
      />
      <ExerciseFooterActions exerciseId={exercise.id} onOpenHistory={onOpenExerciseHistory} onOpenNotes={onOpenExerciseNotes} />
    </section>
  );
}
