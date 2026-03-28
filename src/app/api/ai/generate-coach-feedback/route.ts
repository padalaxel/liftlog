import { NextResponse } from "next/server";
import { serializeCoachApiResponse } from "@/lib/coach-api";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateCoachFeedbackSchema } from "@/lib/validation";
import { runCoachUpdateForWorkout } from "@/lib/workout-coach";

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = generateCoachFeedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await runCoachUpdateForWorkout(
    supabase,
    parsed.data.workout_id,
    userData.user.id,
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    message: "Coach notes generated.",
    used_fallback: result.usedFallback,
    ...serializeCoachApiResponse(result.payload),
  });
}
