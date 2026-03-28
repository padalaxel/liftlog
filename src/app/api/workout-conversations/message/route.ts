import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { workoutConversationMessageSchema } from "@/lib/validation";
import { generateWorkoutConversationReply } from "@/lib/ai/workout-conversation";
import { buildCoachContext } from "@/lib/ai/buildCoachContext";
import { buildCoachMessages } from "@/lib/ai/buildCoachMessages";

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = workoutConversationMessageSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: workout } = await supabase
    .from("workouts")
    .select("id,ai_summary_note,ai_detailed_feedback,ai_next_session_focus,ai_recovery_observation")
    .eq("id", parsed.data.workout_id)
    .eq("user_id", userData.user.id)
    .single();
  if (!workout) return NextResponse.json({ error: "Workout not found" }, { status: 404 });

  const { error: insertUserError } = await supabase.from("workout_conversations").insert({
    workout_id: parsed.data.workout_id,
    user_id: userData.user.id,
    role: "user",
    message: parsed.data.message,
  });
  if (insertUserError) return NextResponse.json({ error: insertUserError.message }, { status: 500 });

  const coachContext = await buildCoachContext({
    userId: userData.user.id,
    workoutId: parsed.data.workout_id,
    includeConversation: true,
    includeHistory: true,
  });
  const messages = buildCoachMessages(coachContext);

  const aiReply = await generateWorkoutConversationReply({
    messages,
    savedCoachNotes: {
      summary_note: workout.ai_summary_note,
      detailed_feedback: workout.ai_detailed_feedback,
      next_session_focus: workout.ai_next_session_focus,
      recovery_observation: workout.ai_recovery_observation,
    },
    userMessage: parsed.data.message,
  });
  const { error: insertAssistantError } = await supabase.from("workout_conversations").insert({
    workout_id: parsed.data.workout_id,
    user_id: userData.user.id,
    role: "assistant",
    message: aiReply.message,
  });
  if (insertAssistantError) {
    return NextResponse.json({ error: insertAssistantError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    reply: aiReply.message,
    model: aiReply.model,
  });
}
