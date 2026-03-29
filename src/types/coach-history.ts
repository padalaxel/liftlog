/**
 * Structured history passed to the AI coach (hypertrophy progression + recovery context).
 */

export type ExerciseHistorySetResult = {
  set_number: number;
  weight: number | null;
  reps: number | null;
};

/** One past appearance of an exercise inside a completed workout. */
export type ExerciseHistoryEntry = {
  workout_id: string;
  workout_date: string;
  workout_name: string;
  exercise_name: string;
  rep_range_min: number | null;
  rep_range_max: number | null;
  target_sets: number | null;
  completed_sets: number;
  set_results: ExerciseHistorySetResult[];
  total_reps: number | null;
  total_volume: number | null;
  rest_seconds: number | null;
  difficulty: string | null;
};

/** One completed workout, program-wide (any training day). */
export type ProgramWorkoutHistoryEntry = {
  workout_id: string;
  workout_date: string;
  workout_name: string;
  exercise_names_performed: string[];
  duration_seconds: number | null;
  difficulty: string | null;
  notes: string | null;
  coach_next_focus: string | null;
  recovery_note: string | null;
};

/** Per-exercise session list for exercises in the current session (max 6 prior sessions each). */
export type ExerciseHistoryForCoach = {
  exercise_name: string;
  /** Newest-first among prior completed workouts only (excludes current workout). */
  sessions: ExerciseHistoryEntry[];
};
