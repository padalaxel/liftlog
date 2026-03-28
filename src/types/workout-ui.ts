export type RepRange = {
  min: number;
  max: number;
};

export type PreviousPerformance = {
  weight: number | null;
  reps: number | null;
  label: string;
};

export type WorkoutSetRowData = {
  id: string;
  setNumber: number;
  previousLabel?: string | null;
  previousPerformance?: PreviousPerformance | null;
  targetWeight?: number | null;
  targetReps?: number | null;
  actualWeight?: number | null;
  actualReps?: number | null;
  rir?: number | null;
  completed: boolean;
  isWarmup?: boolean;
};

export type ExerciseCardData = {
  id: string;
  name: string;
  lastPerformance?: string | null;
  cueText?: string | null;
  progressionHint?: string | null;
  restSeconds?: number | null;
  repRange: RepRange;
  sets: WorkoutSetRowData[];
};

export type ActiveRestTimer = {
  exerciseId: string;
  exerciseName: string;
  durationSeconds: number;
  remainingSeconds: number;
  startedAt: string;
};

export type UpdateSetInput = {
  exerciseId: string;
  setId: string;
  field: "actualWeight" | "actualReps" | "rir";
  value: number | null;
};

export type CompleteSetInput = {
  exerciseId: string;
  setId: string;
  completed: boolean;
  /** When true, skip auto focus/scroll to next row (e.g. keypad will open next field). */
  skipAutoFocus?: boolean;
};

export type UsePreviousInput = {
  exerciseId: string;
  setId: string;
  weight: number | null;
  reps: number | null;
};

export type StartRestTimerInput = {
  exerciseId: string;
  exerciseName: string;
  durationSeconds: number;
};

export type FocusTarget = {
  exerciseId: string;
  setId: string;
  field: "actualWeight" | "actualReps";
  requestKey: number;
} | null;

export type ActiveRowTarget = {
  exerciseId: string;
  setId: string;
} | null;
