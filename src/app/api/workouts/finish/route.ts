import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { finishWorkoutSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = finishWorkoutSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: workout } = await supabase
    .from("workouts")
    .select("started_at,finished_at,user_id")
    .eq("id", parsed.data.workout_id)
    .single();
  if (!workout) return NextResponse.json({ error: "Workout not found" }, { status: 404 });
  if (workout.user_id !== userData.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (workout.finished_at) {
    return NextResponse.json({ ok: true, already_finished: true });
  }

  const durationSeconds = workout?.started_at
    ? Math.max(
        0,
        Math.round((Date.now() - new Date(workout.started_at).getTime()) / 1000),
      )
    : null;

  const { error: workoutError } = await supabase
    .from("workouts")
    .update({
      finished_at: new Date().toISOString(),
      duration_seconds: durationSeconds,
      difficulty: parsed.data.difficulty,
      pain_level: parsed.data.pain_level,
      substitutions_text: parsed.data.substitutions_text ?? null,
      notes: parsed.data.notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.workout_id);

  if (workoutError) return NextResponse.json({ error: workoutError.message }, { status: 500 });

  const payload = parsed.data.sets.map((set) => ({
    workout_id: parsed.data.workout_id,
    ...set,
  }));
  // Idempotent write strategy for repeated submits: replace set rows for this workout.
  const { error: deleteError } = await supabase
    .from("workout_sets")
    .delete()
    .eq("workout_id", parsed.data.workout_id);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  const { error: setError } = await supabase.from("workout_sets").insert(payload);
  if (setError) return NextResponse.json({ error: setError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
