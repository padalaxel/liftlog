/**
 * Reconstructed history from import JSON → completed workout sessions (canonical template names).
 * Run `npm run seed:reconstructed-history` with service role after migrations.
 */

export type ReconstructedExerciseSession = {
  exerciseName: string;
  weight: number;
  reps: number[];
};

export type ReconstructedWorkoutSession = {
  seedKey: string;
  dayName: string;
  exercises: ReconstructedExerciseSession[];
};

type HistorySet = { weight: number; reps: number[] };

type ImportExercise = { name: string; history: HistorySet[] };

type ImportDay = { name: string; exercises: ImportExercise[] };

/** Source data (friendly names); mapped to template_exercise_name via EXERCISE_NAME_TO_TEMPLATE. */
export const IMPORT_HISTORY_BY_DAY: ImportDay[] = [
  {
    name: "Upper A",
    exercises: [
      {
        name: "Bench Press",
        history: [
          { weight: 165, reps: [8, 8, 6, 5] },
          { weight: 165, reps: [7, 7, 7, 6] },
          { weight: 165, reps: [8, 8, 6, 6] },
        ],
      },
      {
        name: "Seated Cable Row",
        history: [
          { weight: 107.5, reps: [12, 12, 12] },
          { weight: 115, reps: [9, 9, 9] },
          { weight: 115, reps: [10, 10, 10] },
        ],
      },
      {
        name: "Incline Dumbbell Press",
        history: [
          { weight: 50, reps: [10, 9, 8] },
          { weight: 50, reps: [10, 10, 8] },
          { weight: 50, reps: [10, 10, 8] },
        ],
      },
      {
        name: "Lateral Raise",
        history: [
          { weight: 17.5, reps: [12, 12, 11] },
          { weight: 17.5, reps: [12, 11, 10] },
          { weight: 17.5, reps: [12, 10, 10] },
        ],
      },
      {
        name: "Rope Pushdown",
        history: [
          { weight: 45, reps: [12, 11, 10] },
          { weight: 45, reps: [10, 9, 8] },
          { weight: 45, reps: [10, 9, 6] },
        ],
      },
      {
        name: "Chest Fly",
        history: [
          { weight: 25, reps: [12, 12, 11] },
          { weight: 25, reps: [12, 11, 11] },
          { weight: 25, reps: [12, 12, 12] },
        ],
      },
    ],
  },
  {
    name: "Upper B",
    exercises: [
      {
        name: "Lat Pulldown",
        history: [
          { weight: 130, reps: [10, 10, 10] },
          { weight: 137.5, reps: [9, 9, 8] },
          { weight: 137.5, reps: [10, 10, 9] },
        ],
      },
      {
        name: "Dumbbell Bench Press (Paused)",
        history: [
          { weight: 60, reps: [10, 9, 8] },
          { weight: 60, reps: [10, 10, 8] },
          { weight: 60, reps: [10, 10, 9] },
        ],
      },
      {
        name: "Seated Row",
        history: [
          { weight: 115, reps: [10, 10, 10] },
          { weight: 115, reps: [10, 10] },
        ],
      },
      {
        name: "Reverse Fly",
        history: [
          { weight: 15, reps: [13, 13, 12] },
          { weight: 15, reps: [14, 14, 13] },
          { weight: 15, reps: [14, 14, 13] },
        ],
      },
      {
        name: "Hammer Curl",
        history: [
          { weight: 30, reps: [10, 9, 8] },
          { weight: 30, reps: [10, 8, 6] },
          { weight: 30, reps: [10, 8, 4] },
        ],
      },
    ],
  },
  {
    name: "Lower A",
    exercises: [
      {
        name: "Leg Press",
        history: [
          { weight: 225, reps: [12, 12, 12, 11] },
          { weight: 235, reps: [12, 12, 12, 10] },
          { weight: 235, reps: [12, 12, 12, 12] },
        ],
      },
      {
        name: "Glute Bridge",
        history: [
          { weight: 135, reps: [10, 10, 10] },
          { weight: 135, reps: [11, 11, 10] },
          { weight: 135, reps: [12, 12, 12] },
        ],
      },
      {
        name: "Leg Extension",
        history: [
          { weight: 120, reps: [12, 12, 12] },
          { weight: 125, reps: [12, 12, 12] },
          { weight: 125, reps: [14, 13, 13] },
        ],
      },
      {
        name: "Leg Curl",
        history: [
          { weight: 70, reps: [12, 11, 10] },
          { weight: 80, reps: [10, 10, 8] },
          { weight: 80, reps: [10, 10, 8] },
        ],
      },
    ],
  },
  {
    name: "Lower B",
    exercises: [
      {
        name: "Romanian Deadlift",
        history: [
          { weight: 180, reps: [10, 9, 8, 8] },
          { weight: 185, reps: [10, 10, 9, 9] },
          { weight: 185, reps: [10, 10, 10, 10] },
        ],
      },
      {
        name: "Hip Thrust",
        history: [
          { weight: 175, reps: [12, 12, 11] },
          { weight: 185, reps: [12, 11, 10] },
          { weight: 185, reps: [12, 12, 12] },
        ],
      },
    ],
  },
];

/** Maps import JSON day labels → program_days.name in DB (see supabase/seed.sql). */
export const DAY_NAME_TO_PROGRAM_DAY: Record<string, string> = {
  "Upper A": "UPPER A",
  "Upper B": "UPPER B",
  "Lower A": "LOWER A (Knee Friendly)",
  "Lower B": "LOWER B",
};

/** Maps import exercise labels → template_exercises.exercise_name. */
export const EXERCISE_NAME_TO_TEMPLATE: Record<string, string> = {
  "Bench Press": "Bench Press (Barbell)",
  "Seated Cable Row": "Seated Row (Cable)",
  "Incline Dumbbell Press": "Incline Bench Press (Dumbbell)",
  "Lateral Raise": "Lateral Raise (Dumbbell)",
  "Rope Pushdown": "Triceps Pushdown (Cable)",
  "Chest Fly": "Chest Fly (Dumbbell)",
  "Lat Pulldown": "Lat Pulldown (Cable)",
  "Dumbbell Bench Press (Paused)": "Bench Press (Dumbbell)",
  "Seated Row": "Seated Row (Cable)",
  "Reverse Fly": "Reverse Fly (Dumbbell)",
  "Hammer Curl": "Hammer Curl (Dumbbell)",
  "Leg Press": "Leg Press",
  "Glute Bridge": "Glute Bridge",
  "Leg Extension": "Leg Extension (Machine)",
  "Leg Curl": "Lying Leg Curl (Machine)",
  "Romanian Deadlift": "Romanian Deadlift (Barbell)",
  "Hip Thrust": "Hip Thrust (Barbell)",
};

/** Four-day rotation order (matches split progression, not alphabetical). */
const ROTATION_DAY_ORDER = ["Upper A", "Lower A", "Upper B", "Lower B"] as const;

const SEED_PREFIX: Record<(typeof ROTATION_DAY_ORDER)[number], string> = {
  "Upper A": "ua",
  "Lower A": "la",
  "Upper B": "ub",
  "Lower B": "lb",
};

function maxRotationIndexForProgram(): number {
  let max = 0;
  for (const day of IMPORT_HISTORY_BY_DAY) {
    for (const ex of day.exercises) {
      max = Math.max(max, ex.history.length);
    }
  }
  return max;
}

/**
 * Flattens import data into completed workout sessions (one per day per rotation),
 * skipping exercises with no data at that rotation index (e.g. Upper B Seated Row on 3rd pass).
 */
export function buildReconstructedSessions(): ReconstructedWorkoutSession[] {
  const byDay = new Map(IMPORT_HISTORY_BY_DAY.map((d) => [d.name, d]));
  const sessions: ReconstructedWorkoutSession[] = [];
  const maxR = maxRotationIndexForProgram();

  for (let r = 0; r < maxR; r++) {
    for (const dayKey of ROTATION_DAY_ORDER) {
      const day = byDay.get(dayKey);
      if (!day) continue;
      const exercises: ReconstructedExerciseSession[] = [];
      for (const ex of day.exercises) {
        const slice = ex.history[r];
        if (!slice) continue;
        const templateName = EXERCISE_NAME_TO_TEMPLATE[ex.name];
        if (!templateName) continue;
        exercises.push({
          exerciseName: templateName,
          weight: slice.weight,
          reps: slice.reps,
        });
      }
      if (exercises.length === 0) continue;
      const programDayName = DAY_NAME_TO_PROGRAM_DAY[dayKey];
      if (!programDayName) continue;
      sessions.push({
        seedKey: `${SEED_PREFIX[dayKey]}-${r}`,
        dayName: programDayName,
        exercises,
      });
    }
  }
  return sessions;
}

let cached: ReconstructedWorkoutSession[] | null = null;

export function getReconstructedSessions(): ReconstructedWorkoutSession[] {
  if (!cached) cached = buildReconstructedSessions();
  return cached;
}
