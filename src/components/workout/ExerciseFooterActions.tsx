export type ExerciseFooterActionsProps = {
  exerciseId: string;
  onOpenHistory?: (exerciseId: string) => void;
  onOpenNotes?: (exerciseId: string) => void;
};

export function ExerciseFooterActions({
  exerciseId,
  onOpenHistory,
  onOpenNotes,
}: ExerciseFooterActionsProps) {
  if (!onOpenHistory && !onOpenNotes) return null;
  return (
    <div className="flex items-center gap-2 pt-0.5 text-[10px] text-neutral-600">
      {onOpenHistory ? (
        <button
          className="inline-flex h-6 items-center gap-1 rounded px-1.5 active:bg-neutral-800/50"
          onClick={() => onOpenHistory(exerciseId)}
        >
          History
        </button>
      ) : null}
      {onOpenNotes ? (
        <button
          className="inline-flex h-6 items-center gap-1 rounded px-1.5 active:bg-neutral-800/50"
          onClick={() => onOpenNotes(exerciseId)}
        >
          Notes
        </button>
      ) : null}
    </div>
  );
}
