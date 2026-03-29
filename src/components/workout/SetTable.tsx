import { Fragment } from "react";
import { AddSetRowButton } from "@/components/workout/AddSetRowButton";
import { InlineRestTimerRow } from "@/components/workout/InlineRestTimerRow";
import { SetRow } from "@/components/workout/SetRow";
import { SetTableHeader } from "@/components/workout/SetTableHeader";
import { setTableLayout } from "@/components/workout/today-layout";
import type {
  ActiveRestTimer,
  ActiveRowTarget,
  CompleteSetInput,
  FocusTarget,
  UsePreviousInput,
  UpdateSetInput,
  WorkoutSetRowData,
} from "@/types/workout-ui";

export type SetTableProps = {
  exerciseId: string;
  sets: WorkoutSetRowData[];
  /** When set, inline rest row is shown under the matching set within this exercise. */
  inlineRestTimer: ActiveRestTimer | null;
  onUpdateSet: (input: UpdateSetInput) => void;
  onCompleteSet: (input: CompleteSetInput) => void;
  onUsePrevious: (input: UsePreviousInput) => void;
  onAddSet: (exerciseId: string) => void;
  onRemoveLastSet: (exerciseId: string) => void;
  activeRow: ActiveRowTarget;
  focusTarget: FocusTarget;
  onActiveRowChange: (target: ActiveRowTarget) => void;
};

export function SetTable({
  exerciseId,
  sets,
  inlineRestTimer,
  onUpdateSet,
  onCompleteSet,
  onUsePrevious,
  onAddSet,
  onRemoveLastSet,
  activeRow,
  focusTarget,
  onActiveRowChange,
}: SetTableProps) {
  const showTimerAfter = (setId: string) =>
    inlineRestTimer != null &&
    inlineRestTimer.exerciseId === exerciseId &&
    inlineRestTimer.setId === setId;

  return (
    <div className="mt-1 overflow-hidden rounded-md border border-neutral-800/80 bg-neutral-950/20">
      <SetTableHeader />
      <div>
        {sets.map((set) => (
          <Fragment key={set.id}>
            <SetRow
              exerciseId={exerciseId}
              set={set}
              gridTemplate={setTableLayout.gridWithPrevious}
              isActive={activeRow?.exerciseId === exerciseId && activeRow?.setId === set.id}
              focusTarget={focusTarget}
              onUpdateSet={onUpdateSet}
              onCompleteSet={onCompleteSet}
              onUsePrevious={onUsePrevious}
              onActiveRowChange={onActiveRowChange}
            />
            {showTimerAfter(set.id) && inlineRestTimer ? (
              <InlineRestTimerRow
                exerciseId={inlineRestTimer.exerciseId}
                setId={inlineRestTimer.setId}
                remainingSeconds={inlineRestTimer.remainingSeconds}
                durationSeconds={inlineRestTimer.durationSeconds}
                isUrgent={inlineRestTimer.remainingSeconds > 0 && inlineRestTimer.remainingSeconds <= 10}
              />
            ) : null}
          </Fragment>
        ))}
      </div>
      <AddSetRowButton
        exerciseId={exerciseId}
        onAddSet={onAddSet}
        onRemoveLastSet={onRemoveLastSet}
        canRemove={sets.length > 1}
      />
    </div>
  );
}
