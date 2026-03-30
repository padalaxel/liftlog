/** Shared trim + lowercase for matching exercise names in coach code. */
export function normalizeCoachExerciseName(name: string): string {
  return name.trim().toLowerCase();
}
