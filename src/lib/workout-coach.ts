import { generateNextSessionUpdate } from "@/lib/ai/update-next-session";
import { buildFallbackProgression } from "@/lib/progression-fallback";
import type { AIUpdatePayload } from "@/lib/validation";
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
    modelName = aiResult.model;
    resultPayload = aiResult.data;
  }

  const byName = new Map(resultPayload.exercises.map((ex) => [ex.exercise_name.toLowerCase(), ex]));
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

  const { error: workoutWriteError } = await supabase
    .from("workouts")
    .update({
      ai_summary_note: resultPayload.summary_note,
      ai_detailed_feedback: resultPayload.detailed_feedback,
      ai_next_session_focus: resultPayload.next_session_focus,
      ai_recovery_observation: resultPayload.recovery_observation,
    })
    .eq("id", workoutId);
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
