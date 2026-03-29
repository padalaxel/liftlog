import { ExerciseCard } from "@/components/workout/ExerciseCard";
import type {
  ActiveRestTimer,
  ActiveRowTarget,
  CompleteSetInput,
  ExerciseCardData,
  FocusTarget,
  UsePreviousInput,
  UpdateSetInput,
} from "@/types/workout-ui";

export type ExerciseListProps = {
  exercises: ExerciseCardData[];
  inlineRestTimer: ActiveRestTimer | null;
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

export function ExerciseList({
  exercises,
  inlineRestTimer,
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
}: ExerciseListProps) {
  return (
    <div className="flex flex-col gap-2.5">
      {exercises.map((exercise) => (
        <ExerciseCard
          key={exercise.id}
          exercise={exercise}
          inlineRestTimer={
            inlineRestTimer?.exerciseId === exercise.id ? inlineRestTimer : null
          }
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
      ))}
    </div>
  );
}
