import { setTableLayout } from "@/components/workout/today-layout";

export type SetTableHeaderProps = {
  showPrevious?: boolean;
};

export function SetTableHeader({ showPrevious = true }: SetTableHeaderProps) {
  return (
    <div
      className={`grid h-7 items-center gap-1 bg-neutral-950/20 px-2 text-[10px] font-medium uppercase tracking-[0.08em] text-neutral-700 tabular-nums ${setTableLayout.gridWithPrevious}`}
    >
      <span className="text-center">Set</span>
      {showPrevious ? <span>Prev</span> : <span>Target</span>}
      <span className="text-right">LB</span>
      <span className="text-right">Reps</span>
      <span className="text-center">✓</span>
    </div>
  );
}
