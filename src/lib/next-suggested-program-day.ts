/**
 * Pick the next training day in program order after the most recently finished session.
 * Users can still open any day from Programs; this only drives the default "Today" suggestion.
 */

export type ProgramDayOrder = {
  id: string;
  order_index: number;
};

export type FinishedWorkoutRef = {
  program_day_id: string;
  finished_at: string | null;
};

export function pickSuggestedProgramDay<T extends ProgramDayOrder>(
  days: T[],
  lastFinished: FinishedWorkoutRef | null,
): T {
  const sorted = days.slice().sort((a, b) => a.order_index - b.order_index);
  if (sorted.length === 0) {
    throw new Error("pickSuggestedProgramDay: no program days");
  }
  if (!lastFinished?.finished_at) {
    return sorted[0];
  }
  const idx = sorted.findIndex((d) => d.id === lastFinished.program_day_id);
  if (idx < 0) {
    return sorted[0];
  }
  const nextIdx = (idx + 1) % sorted.length;
  return sorted[nextIdx];
}

export function pickLatestFinishedWorkout(
  history: FinishedWorkoutRef[],
): FinishedWorkoutRef | null {
  const completed = history.filter((w) => w.finished_at != null);
  if (completed.length === 0) return null;
  return completed.sort(
    (a, b) => new Date(b.finished_at!).getTime() - new Date(a.finished_at!).getTime(),
  )[0];
}
