import { createSupabaseServerClient } from "@/lib/supabase/server";

const MAX_RECENT_WORKOUTS = 6;
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
  };
  workout_context: WorkoutContext;
  recent_workouts: Array<{
    date: string;
    program_day: string;
    exercises: Array<{
      exercise_name: string;
      sets: Array<{
        set_number: number;
        weight: number | null;
        reps: number | null;
        completed: boolean;
      }>;
    }>;
  }>;
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

  const templateIds = new Set((templates ?? []).map((t) => t.id));
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

  let recent_workouts: CoachContext["recent_workouts"] = [];
  if (includeHistory) {
    const { data: candidateWorkouts, error: historyError } = await supabase
      .from("workouts")
      .select("id,started_at,program_day_id,program_days(name),workout_sets(*)")
      .eq("user_id", userId)
      .neq("id", workoutId)
      .order("started_at", { ascending: false })
      .limit(20);
    if (historyError) throw new Error(historyError.message);

    recent_workouts = (candidateWorkouts ?? [])
      .filter((w) => w.program_day_id === workout.program_day_id)
      .map((w) => {
        const grouped = new Map<
          string,
          Array<{
            set_number: number;
            actual_weight: number | null;
            actual_reps: number | null;
            completed: boolean;
            template_exercise_id: string;
          }>
        >();
        for (const set of w.workout_sets ?? []) {
          if (!templateIds.has(set.template_exercise_id)) continue;
          const arr = grouped.get(set.template_exercise_id) ?? [];
          arr.push(set);
          grouped.set(set.template_exercise_id, arr);
        }
        return {
          date: w.started_at,
          program_day: readName(w.program_days, "Unknown day"),
          exercises: (templates ?? [])
            .filter((t) => grouped.has(t.id))
            .slice(0, MAX_EXERCISES_PER_WORKOUT)
            .map((t) => ({
              exercise_name: t.exercise_name,
              sets: (grouped.get(t.id) ?? [])
                .sort((a, b) => a.set_number - b.set_number)
                .map((s) => ({
                  set_number: s.set_number,
                  weight: s.actual_weight === null ? null : Number(s.actual_weight),
                  reps: s.actual_reps,
                  completed: s.completed,
                })),
            })),
        };
      })
      .filter((w) => w.exercises.length > 0)
      .slice(0, MAX_RECENT_WORKOUTS);
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
    },
    workout_context,
    recent_workouts,
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
