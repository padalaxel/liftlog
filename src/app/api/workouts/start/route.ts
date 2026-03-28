import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { startWorkoutSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = startWorkoutSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: existing } = await supabase
    .from("workouts")
    .select("*")
    .eq("user_id", userData.user.id)
    .eq("program_day_id", parsed.data.program_day_id)
    .is("finished_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) return NextResponse.json({ workout: existing });

  const { data, error } = await supabase
    .from("workouts")
    .insert({
      user_id: userData.user.id,
      program_day_id: parsed.data.program_day_id,
      started_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ workout: data });
}
