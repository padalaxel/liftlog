const STORAGE_KEY = "liftlog-active-workout";

export type ActiveWorkoutSession = {
  workoutId: string;
  programDayId: string;
  programDayName?: string;
  startedAt: string;
  isDemo?: boolean;
};

export function readActiveWorkoutSession(): ActiveWorkoutSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const o = parsed as Record<string, unknown>;
    if (typeof o.workoutId !== "string" || typeof o.programDayId !== "string") return null;
    return {
      workoutId: o.workoutId,
      programDayId: o.programDayId,
      programDayName: typeof o.programDayName === "string" ? o.programDayName : undefined,
      startedAt: typeof o.startedAt === "string" ? o.startedAt : new Date().toISOString(),
      isDemo: o.isDemo === true,
    };
  } catch {
    return null;
  }
}

export function writeActiveWorkoutSession(session: ActiveWorkoutSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearActiveWorkoutSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
