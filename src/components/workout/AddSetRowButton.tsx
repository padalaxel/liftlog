export type AddSetRowButtonProps = {
  exerciseId: string;
  onAddSet: (exerciseId: string) => void;
  onRemoveLastSet?: (exerciseId: string) => void;
  canRemove?: boolean;
};

export function AddSetRowButton({
  exerciseId,
  onAddSet,
  onRemoveLastSet,
  canRemove = false,
}: AddSetRowButtonProps) {
  return (
    <div className="grid h-10 grid-cols-[1fr_auto] items-center border-t border-neutral-800/60 bg-transparent">
      <button
        className="h-full w-full text-center text-sm text-neutral-500/90 active:bg-neutral-800/30"
        onClick={() => onAddSet(exerciseId)}
      >
        + Add Set
      </button>
      {canRemove ? (
        <button
          className="mr-1 flex h-7 min-w-7 items-center justify-center rounded px-1.5 text-[11px] text-neutral-700 active:bg-neutral-800/40"
          onClick={() => onRemoveLastSet?.(exerciseId)}
          aria-label="Remove last set"
        >
          -
        </button>
      ) : (
        <span className="mr-1 inline-block h-8 min-w-8" />
      )}
    </div>
  );
}
