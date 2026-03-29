import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  ExerciseHistoryEntry,
  ExerciseHistoryForCoach,
  ProgramWorkoutHistoryEntry,
} from "@/types/coach-history";

/** Hard cap on workouts fetched for coach context (query safety). */
export const COACH_MAX_WORKOUTS_FETCH = 20;
/** Program-wide completed workouts shown to the model. */
export const COACH_PROGRAM_WORKOUT_HISTORY_LIMIT = 12;
/** Prior completed sessions per exercise (same exercise name, any program day). */
export const COACH_EXERCISE_SESSION_LIMIT = 6;

const MAX_EXERCISES_PER_WORKOUT = 12;
const MAX_CONVERSATION_MESSAGES = 12;

function readName(value: unknown, fallback: string) {
  if (Array.isArray(value)) {
    const first = value[0] as { name?: string } | undefined;
    return first?.name ?? fallback;
  }
  if (value && typeof value === "object" && "name" in value) {
    return (value as { name?: string }).name ?? fallback;
  }
  return fallback;
}

function readGoal(value: unknown) {
  if (Array.isArray(value)) {
    const first = value[0] as { goal?: string | null } | undefined;
    return first?.goal ?? null;
  }
  if (value && typeof value === "object" && "goal" in value) {
    return (value as { goal?: string | null }).goal ?? null;
  }
  return null;
}

export function normalizeCoachExerciseName(name: string): string {
  return name.trim().toLowerCase();
}

type TemplateExerciseEmbed = {
  exercise_name?: string;
  rep_min?: number;
  rep_max?: number;
  target_sets?: number;
  rest_seconds?: number;
};

type WorkoutSetRow = {
  set_number: number;
  actual_weight: number | string | null;
  actual_reps: number | null;
  completed: boolean;
  target_reps?: number | null;
  template_exercise_id: string;
  template_exercises?: TemplateExerciseEmbed | TemplateExerciseEmbed[] | null;
};

type HistoryWorkoutRow = {
  id: string;
  started_at: string;
  finished_at: string | null;
  duration_seconds: number | null;
  difficulty: string | null;
  notes: string | null;
  ai_next_session_focus: string | null;
  ai_recovery_observation: string | null;
  program_days?: { name?: string } | { name?: string }[] | null;
  workout_sets?: WorkoutSetRow[] | null;
};

function unwrapTemplate(
  te: TemplateExerciseEmbed | TemplateExerciseEmbed[] | null | undefined,
): TemplateExerciseEmbed | null {
  if (!te) return null;
  if (Array.isArray(te)) return te[0] ?? null;
  return te;
}

function numOrNull(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function buildExerciseHistoryEntryFromSets(
  workout: HistoryWorkoutRow,
  workoutName: string,
  exerciseName: string,
  templateMeta: TemplateExerciseEmbed,
  sets: WorkoutSetRow[],
): ExerciseHistoryEntry {
  const sorted = [...sets].sort((a, b) => a.set_number - b.set_number);
  const completedRows = sorted.filter((s) => s.completed);
  const set_results = sorted.map((s) => ({
    set_number: s.set_number,
    weight: numOrNull(s.actual_weight),
    reps: s.actual_reps,
  }));
  let totalReps = 0;
  let totalVol = 0;
  let volParts = 0;
  for (const s of completedRows) {
    const r = s.actual_reps;
    const w = numOrNull(s.actual_weight);
    if (r != null && Number.isFinite(r)) totalReps += r;
    if (r != null && w != null && Number.isFinite(r) && Number.isFinite(w)) {
      totalVol += w * r;
      volParts += 1;
    }
  }
  const date = workout.finished_at ?? workout.started_at;
  return {
    workout_id: workout.id,
    workout_date: date,
    workout_name: workoutName,
    exercise_name: exerciseName,
    rep_range_min: templateMeta.rep_min ?? null,
    rep_range_max: templateMeta.rep_max ?? null,
    target_sets: templateMeta.target_sets ?? null,
    completed_sets: completedRows.length,
    set_results,
    total_reps: completedRows.length ? totalReps : null,
    total_volume: volParts ? Math.round(totalVol) : null,
    rest_seconds: templateMeta.rest_seconds ?? null,
    difficulty: workout.difficulty,
  };
}

/** One combined entry per workout when the same name appears on multiple templates (edge case). */
function exerciseEntryForWorkout(
  workout: HistoryWorkoutRow,
  targetNameNorm: string,
  displayName: string,
): ExerciseHistoryEntry | null {
  const workoutName = readName(workout.program_days, "Unknown day");
  const matchingSets: WorkoutSetRow[] = [];
  let meta: TemplateExerciseEmbed | null = null;
  for (const row of workout.workout_sets ?? []) {
    const te = unwrapTemplate(row.template_exercises);
    if (!te?.exercise_name) continue;
    if (normalizeCoachExerciseName(te.exercise_name) !== targetNameNorm) continue;
    matchingSets.push(row);
    if (!meta) meta = te;
  }
  if (matchingSets.length === 0 || !meta) return null;
  return buildExerciseHistoryEntryFromSets(workout, workoutName, displayName, meta, matchingSets);
}

function buildProgramWorkoutHistoryEntry(w: HistoryWorkoutRow): ProgramWorkoutHistoryEntry {
  const names = new Set<string>();
  for (const row of w.workout_sets ?? []) {
    const te = unwrapTemplate(row.template_exercises);
    const n = te?.exercise_name?.trim();
    if (n) names.add(n);
  }
  const date = w.finished_at ?? w.started_at;
  const truncate = (s: string | null, max: number) =>
    s && s.length > max ? `${s.slice(0, max)}…` : s;
  return {
    workout_id: w.id,
    workout_date: date,
    workout_name: readName(w.program_days, "Unknown day"),
    exercise_names_performed: [...names].sort((a, b) => a.localeCompare(b)),
    duration_seconds: w.duration_seconds,
    difficulty: w.difficulty,
    notes: truncate(w.notes, 400),
    coach_next_focus: truncate(w.ai_next_session_focus, 500),
    recovery_note: truncate(w.ai_recovery_observation, 400),
  };
}

export interface ConversationMessage {
  role: "user" | "assistant";
  message: string;
}

export interface ExerciseContext {
  exercise_name: string;
  planned_sets: number;
  rep_range: string;
  planned_weight: number;
  actual_sets: Array<{
    set_number: number;
    weight: number | null;
    reps: number | null;
    rir: number | null;
  }>;
}

export interface WorkoutContext {
  workout_id: string;
  program_day: string;
  difficulty: string | null;
  pain_level: string | null;
  substitutions: string | null;
  notes: string | null;
  exercises: ExerciseContext[];
}

export interface CoachContext {
  system_context: {
    coach_style: string;
    priorities: string[];
    tone_rules: string[];
    history_usage_rules: string[];
  };
  workout_context: WorkoutContext;
  /** Prior sessions of the same exercise name (any program day), newest-first, max 6 each. */
  exercise_history: ExerciseHistoryForCoach[];
  /** Last N completed workouts (any day), newest-first, for fatigue / recovery context. */
  program_workout_history: ProgramWorkoutHistoryEntry[];
  program_context: {
    program_name: string;
    goal: string | null;
    program_day: string;
    exercises: Array<{
      exercise_name: string;
      target_sets: number;
      rep_min: number;
      rep_max: number;
      target_weight: number;
      progression_rule: string;
      increment_lbs: number;
      rest_seconds: number;
    }>;
  };
  conversation_context: ConversationMessage[];
}

export async function buildCoachContext({
  userId,
  workoutId,
  includeConversation = true,
  includeHistory = true,
}: {
  userId: string;
  workoutId: string;
  includeConversation?: boolean;
  includeHistory?: boolean;
}): Promise<CoachContext> {
  const supabase = await createSupabaseServerClient();

  const { data: workout, error: workoutError } = await supabase
    .from("workouts")
    .select("*, program_days(id,name,program_id)")
    .eq("id", workoutId)
    .eq("user_id", userId)
    .single();
  if (workoutError || !workout) {
    throw new Error(workoutError?.message ?? "Workout not found");
  }

  const { data: templates, error: templatesError } = await supabase
    .from("template_exercises")
    .select("*")
    .eq("program_day_id", workout.program_day_id)
    .order("order_index", { ascending: true })
    .limit(MAX_EXERCISES_PER_WORKOUT);
  if (templatesError) throw new Error(templatesError.message);

  const { data: workoutSets, error: setsError } = await supabase
    .from("workout_sets")
    .select("*")
    .eq("workout_id", workoutId)
    .order("set_number", { ascending: true });
  if (setsError) throw new Error(setsError.message);

  const { data: programDay, error: dayError } = await supabase
    .from("program_days")
    .select("id,name,programs(name,goal)")
    .eq("id", workout.program_day_id)
    .single();
  if (dayError) throw new Error(dayError.message);

  const currentProgramDayName = readName(workout.program_days, "Unknown day");
  const workout_context: WorkoutContext = {
    workout_id: workout.id,
    program_day: currentProgramDayName,
    difficulty: workout.difficulty,
    pain_level: workout.pain_level,
    substitutions: workout.substitutions_text,
    notes: workout.notes,
    exercises: (templates ?? []).map((template) => ({
      exercise_name: template.exercise_name,
      planned_sets: template.target_sets,
      rep_range: `${template.rep_min}-${template.rep_max}`,
      planned_weight: Number(template.target_weight),
      actual_sets: (workoutSets ?? [])
        .filter((set) => set.template_exercise_id === template.id)
        .sort((a, b) => a.set_number - b.set_number)
        .map((set) => ({
          set_number: set.set_number,
          weight: set.actual_weight === null ? null : Number(set.actual_weight),
          reps: set.actual_reps,
          rir: set.rir,
        })),
    })),
  };

  let exercise_history: ExerciseHistoryForCoach[] = [];
  let program_workout_history: ProgramWorkoutHistoryEntry[] = [];

  if (includeHistory) {
    const { data: historyRows, error: historyError } = await supabase
      .from("workouts")
      .select(
        `
        id,
        started_at,
        finished_at,
        duration_seconds,
        difficulty,
        notes,
        ai_next_session_focus,
        ai_recovery_observation,
        program_days(name),
        workout_sets(
          set_number,
          actual_weight,
          actual_reps,
          completed,
          target_reps,
          template_exercise_id,
          template_exercises(
            exercise_name,
            rep_min,
            rep_max,
            target_sets,
            rest_seconds
          )
        )
      `,
      )
      .eq("user_id", userId)
      .neq("id", workoutId)
      .not("finished_at", "is", null)
      .order("finished_at", { ascending: false })
      .limit(COACH_MAX_WORKOUTS_FETCH);

    if (historyError) throw new Error(historyError.message);

    const historyWorkouts = (historyRows ?? []) as HistoryWorkoutRow[];

    program_workout_history = historyWorkouts
      .slice(0, COACH_PROGRAM_WORKOUT_HISTORY_LIMIT)
      .map(buildProgramWorkoutHistoryEntry);

    const currentNamesOrdered: string[] = [];
    const seenNorm = new Set<string>();
    for (const t of templates ?? []) {
      const n = String(t.exercise_name).trim();
      const norm = normalizeCoachExerciseName(n);
      if (!n || seenNorm.has(norm)) continue;
      seenNorm.add(norm);
      currentNamesOrdered.push(n);
    }

    exercise_history = currentNamesOrdered.map((displayName) => {
      const norm = normalizeCoachExerciseName(displayName);
      const sessions: ExerciseHistoryEntry[] = [];
      for (const w of historyWorkouts) {
        if (sessions.length >= COACH_EXERCISE_SESSION_LIMIT) break;
        const entry = exerciseEntryForWorkout(w, norm, displayName);
        if (entry) sessions.push(entry);
      }
      return { exercise_name: displayName, sessions };
    });
  }

  let conversation_context: ConversationMessage[] = [];
  if (includeConversation) {
    const { data: conversationRows, error: conversationError } = await supabase
      .from("workout_conversations")
      .select("role,message,created_at")
      .eq("workout_id", workoutId)
      .eq("user_id", userId)
      .in("role", ["user", "assistant"])
      .order("created_at", { ascending: false })
      .limit(MAX_CONVERSATION_MESSAGES);
    if (conversationError) throw new Error(conversationError.message);
    conversation_context = (conversationRows ?? [])
      .slice()
      .reverse()
      .map((row) => ({ role: row.role as "user" | "assistant", message: row.message }));
  }

  return {
    system_context: {
      coach_style: "experienced hypertrophy coach, analytical, concise, practical",
      priorities: [
        "progressive overload",
        "fatigue management",
        "repeatable technique",
        "long-term progress",
      ],
      tone_rules: [
        "avoid fluff",
        "avoid generic praise",
        "avoid hype language",
        "be specific",
        "base conclusions on data",
      ],
      history_usage_rules: [
        "Base load/rep progression decisions primarily on the last 3 prior sessions of the SAME exercise name in exercise_history (ignore unrelated lifts).",
        "Use up to 6 prior sessions per exercise to confirm trends vs one-off bad days—do not overreact to a single poor session.",
        "Use program_workout_history (recent completed workouts across all days) for systemic fatigue, recovery, and session-to-session energy—not for comparing unrelated exercise loads.",
        "If an exercise has fewer than 3 prior sessions, use all available sessions and state uncertainty briefly.",
        "Cite concrete numbers from exercise_history and workout_context when explaining decisions.",
      ],
    },
    workout_context,
    exercise_history,
    program_workout_history,
    program_context: {
      program_name: readName(programDay.programs, "Active program"),
      goal: readGoal(programDay.programs),
      program_day: programDay.name,
      exercises: (templates ?? []).slice(0, MAX_EXERCISES_PER_WORKOUT).map((t) => ({
        exercise_name: t.exercise_name,
        target_sets: t.target_sets,
        rep_min: t.rep_min,
        rep_max: t.rep_max,
        target_weight: Number(t.target_weight),
        progression_rule: t.progression_rule,
        increment_lbs: Number(t.increment_lbs),
        rest_seconds: t.rest_seconds,
      })),
    },
    conversation_context,
  };
}
