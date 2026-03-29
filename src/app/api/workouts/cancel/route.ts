import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cancelWorkoutSchema } from "@/lib/validation";

/** Deletes an in-progress workout (no `finished_at`) so it never appears in history. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = cancelWorkoutSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: row, error: fetchErr } = await supabase
    .from("workouts")
    .select("id, finished_at")
    .eq("id", parsed.data.workout_id)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: "Workout not found" }, { status: 404 });
  if (row.finished_at) {
    return NextResponse.json({ error: "Workout already finished." }, { status: 409 });
  }

  const { error: delErr } = await supabase.from("workouts").delete().eq("id", parsed.data.workout_id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
