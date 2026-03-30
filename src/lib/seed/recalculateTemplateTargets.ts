/**
 * Double-progression style: bump load only when every logged rep hits rep_max; else hold at median session weight.
 * Matches the conservative rule used by the coach layer (no new progression rules).
 */
export function medianWeight(weights: number[]): number | null {
  const w = weights.filter((x) => Number.isFinite(x));
  if (w.length === 0) return null;
  const s = [...w].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function nextTargetFromLastSession(input: {
  reps: number[];
  weights: number[];
  repMax: number;
  incrementLbs: number;
}): number {
  const inc = input.incrementLbs > 0 ? input.incrementLbs : 5;
  const reps = input.reps.filter((r) => r != null && Number.isFinite(r));
  if (reps.length === 0) return 0;
  const mw = medianWeight(input.weights) ?? 0;
  const allAtTop = reps.every((r) => r >= input.repMax);
  const next = allAtTop ? mw + inc : mw;
  return Math.round(next * 1000) / 1000;
}
