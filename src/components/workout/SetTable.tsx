import { AddSetRowButton } from "@/components/workout/AddSetRowButton";
import { SetRow } from "@/components/workout/SetRow";
import { SetTableHeader } from "@/components/workout/SetTableHeader";
import { setTableLayout } from "@/components/workout/today-layout";
import type {
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
  onUpdateSet,
  onCompleteSet,
  onUsePrevious,
  onAddSet,
  onRemoveLastSet,
  activeRow,
  focusTarget,
  onActiveRowChange,
}: SetTableProps) {
  return (
    <div className="mt-1 overflow-hidden rounded-md border border-neutral-800/80 bg-neutral-950/20">
      <SetTableHeader />
      <div>
        {sets.map((set) => (
          <SetRow
            key={set.id}
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
