import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const updateSchema = z.object({
  exercises: z.array(
    z.object({
      id: z.string().uuid(),
      exercise_name: z.string().min(1),
      order_index: z.number().int().positive(),
      target_sets: z.number().int().min(1).max(10),
      rep_min: z.number().int().min(1).max(30),
      rep_max: z.number().int().min(1).max(30),
      target_weight: z.number().min(0),
      increment_lbs: z.number().min(0),
      rest_seconds: z.number().int().min(30).max(600),
      progression_rule: z.string(),
    }),
  ),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  for (const ex of parsed.data.exercises) {
    const { error } = await supabase
      .from("template_exercises")
      .update({
        exercise_name: ex.exercise_name,
        order_index: ex.order_index,
        target_sets: ex.target_sets,
        rep_min: ex.rep_min,
        rep_max: ex.rep_max,
        target_weight: ex.target_weight,
        increment_lbs: ex.increment_lbs,
        rest_seconds: ex.rest_seconds,
        progression_rule: ex.progression_rule,
      })
      .eq("program_day_id", id)
      .eq("id", ex.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
