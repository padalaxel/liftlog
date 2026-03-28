import { NextResponse } from "next/server";
import { serializeCoachApiResponse } from "@/lib/coach-api";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { runCoachUpdateForWorkout } from "@/lib/workout-coach";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const workoutId = body.workout_id as string | undefined;
    if (!workoutId) return NextResponse.json({ error: "workout_id required" }, { status: 400 });

    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }
    const result = await runCoachUpdateForWorkout(supabase, workoutId, userData.user.id);
    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message }, { status: result.status });
    }

    return NextResponse.json({
      ok: true,
      message: result.message,
      used_fallback: result.usedFallback,
      ...serializeCoachApiResponse(result.payload),
    });
  } catch (err) {
    console.error("[POST /api/ai/update-next-session]", err);
    return NextResponse.json(
      {
        ok: false,
        message: err instanceof Error ? err.message : "Unexpected server error",
      },
      { status: 500 },
    );
  }
}
