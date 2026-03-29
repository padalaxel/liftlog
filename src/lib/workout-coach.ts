import { generateNextSessionUpdate } from "@/lib/ai/update-next-session";
import { buildFallbackProgression } from "@/lib/progression-fallback";
import type { AIUpdatePayload } from "@/lib/validation";
import { legacyDetailedFromStructured, nextFocusLinesFromArray } from "@/types/coach";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildCoachContext } from "@/lib/ai/buildCoachContext";
import { buildCoachMessages } from "@/lib/ai/buildCoachMessages";

export async function runCoachUpdateForWorkout(
  supabase: SupabaseClient,
  workoutId: string,
  userId: string,
) {
  const { data: workout, error: workoutError } = await supabase
    .from("workouts")
    .select("*")
    .eq("id", workoutId)
    .eq("user_id", userId)
    .single();
  if (workoutError) {
    return { ok: false as const, status: 500, message: workoutError.message };
  }
  if (!workout) return { ok: false as const, status: 404, message: "Workout not found" };

  const { data: sets, error: setsError } = await supabase
    .from("workout_sets")
    .select("*")
    .eq("workout_id", workoutId);
  if (setsError) return { ok: false as const, status: 500, message: setsError.message };

  const { data: templateContext, error: templateContextError } = await supabase
    .from("template_exercises")
    .select("*")
    .eq("program_day_id", workout.program_day_id)
    .order("order_index", { ascending: true });
  if (templateContextError) {
    return { ok: false as const, status: 500, message: templateContextError.message };
  }

  let aiResult: Awaited<ReturnType<typeof generateNextSessionUpdate>>;
  try {
    const coachContext = await buildCoachContext({
      userId,
      workoutId,
      includeConversation: false,
      includeHistory: true,
    });
    aiResult = await generateNextSessionUpdate(buildCoachMessages(coachContext));
  } catch (error) {
    return {
      ok: false as const,
      status: 500,
      message: error instanceof Error ? error.message : "Failed to build coach context",
    };
  }

  let resultPayload: AIUpdatePayload;
  let modelName = "fallback-rules";
  let usedFallback = false;
  if (!aiResult.ok) {
    usedFallback = true;
    resultPayload = buildFallbackProgression(
      templateContext ?? [],
      sets ?? [],
      workout.difficulty,
    );
  } else {
    modelName =
      (typeof aiResult.model === "string" && aiResult.model.length > 0
        ? aiResult.model
        : null) ?? process.env.OPENAI_MODEL ?? "openai-responses";
    resultPayload = aiResult.data;
  }

  const byName = new Map(
    (resultPayload.exercises ?? []).map((ex) => [ex.exercise_name.toLowerCase(), ex]),
  );
  const { data: templates, error: templatesError } = await supabase
    .from("template_exercises")
    .select("*")
    .eq("program_day_id", workout.program_day_id);
  if (templatesError) return { ok: false as const, status: 500, message: templatesError.message };
  for (const template of templates ?? []) {
    const update = byName.get(String(template.exercise_name).toLowerCase());
    if (!update) continue;
    const { error: templateUpdateError } = await supabase
      .from("template_exercises")
      .update({
        target_sets: update.target_sets,
        rep_min: update.rep_min,
        rep_max: update.rep_max,
        target_weight: update.target_weight,
        rest_seconds: update.rest_seconds,
        cue_text: update.cue_text,
      })
      .eq("id", template.id);
    if (templateUpdateError) {
      return { ok: false as const, status: 500, message: templateUpdateError.message };
    }
  }

  const structuredStore = {
    session_summary: resultPayload.session_summary,
    exercise_adjustments: resultPayload.exercise_adjustments,
    next_session_focus: resultPayload.next_session_focus,
    recovery: resultPayload.recovery,
  };

  const baseWorkoutCoachColumns = {
    ai_summary_note: resultPayload.session_summary,
    ai_detailed_feedback: legacyDetailedFromStructured(structuredStore),
    ai_next_session_focus: nextFocusLinesFromArray(resultPayload.next_session_focus),
    ai_recovery_observation: resultPayload.recovery,
  };

  let workoutWriteError = (
    await supabase
      .from("workouts")
      .update({
        ...baseWorkoutCoachColumns,
        ai_coach_structured: structuredStore,
      })
      .eq("id", workoutId)
  ).error;

  if (
    workoutWriteError &&
    /ai_coach_structured|schema cache|column.*workouts/i.test(workoutWriteError.message)
  ) {
    console.warn(
      "[workout-coach] Retrying without ai_coach_structured — run migration 20260328_ai_coach_structured.sql on Supabase.",
    );
    workoutWriteError = (
      await supabase.from("workouts").update(baseWorkoutCoachColumns).eq("id", workoutId)
    ).error;
  }

  if (workoutWriteError) {
    return { ok: false as const, status: 500, message: workoutWriteError.message };
  }

  const { error: aiUpdateInsertError } = await supabase.from("ai_updates").insert({
    source_workout_id: workoutId,
    user_id: workout.user_id,
    target_program_day_id: workout.program_day_id,
    model_name: modelName,
    request_payload: { workout, sets },
    response_payload: { used_fallback: usedFallback, payload: resultPayload },
    applied_successfully: true,
  });
  if (aiUpdateInsertError) {
    return { ok: false as const, status: 500, message: aiUpdateInsertError.message };
  }

  return {
    ok: true as const,
    usedFallback,
    payload: resultPayload,
    message: usedFallback
      ? "Updated next session with fallback coaching rules."
      : "Updated next session.",
  };
}
