import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: workout, error } = await supabase
    .from("workouts")
    .select("*, workout_sets(*), program_days(name)")
    .eq("id", id)
    .eq("user_id", userData.user.id)
    .single();
  if (error || !workout) return NextResponse.json({ error: "Workout not found" }, { status: 404 });

  const { data: templates } = await supabase
    .from("template_exercises")
    .select("*")
    .eq("program_day_id", workout.program_day_id)
    .order("order_index", { ascending: true });

  const { data: conversations } = await supabase
    .from("workout_conversations")
    .select("id,role,message,created_at")
    .eq("workout_id", id)
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: true });

  return NextResponse.json({
    workout,
    templates: templates ?? [],
    conversations: conversations ?? [],
  });
}
