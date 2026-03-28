import OpenAI from "openai";
import { CONVERSATIONAL_COACH_PROMPT } from "@/lib/ai/conversationalCoachPrompt";

function buildFallbackReply(input: {
  userMessage: string;
  workoutContext: unknown;
  savedCoachNotes: unknown;
}) {
  const lower = input.userMessage.toLowerCase();
  const notes =
    typeof input.savedCoachNotes === "object" && input.savedCoachNotes
      ? (input.savedCoachNotes as Record<string, unknown>)
      : {};
  const summary =
    typeof notes.summary_note === "string" ? notes.summary_note : "No summary available yet.";
  const focus =
    typeof notes.next_session_focus === "string"
      ? notes.next_session_focus
      : "Focus on clean reps and consistent execution next session.";

  if (lower.includes("why") || lower.includes("go up") || lower.includes("progress")) {
    return `Based on your logged session, the safest call is to progress only when completed sets consistently hit the top of the target rep range. Current notes: ${summary} Next-session focus: ${focus}`;
  }
  if (lower.includes("deload") || lower.includes("fatigue") || lower.includes("recovery")) {
    return `Use your recorded difficulty, pain, and rep drop-off as the trigger. If effort stays high and rep quality keeps falling across sessions, deload load or reduce one set before pushing again. Current focus: ${focus}`;
  }
  return `I could not generate a full AI response right now, but your saved coach notes still apply: ${summary} Next-session focus: ${focus}`;
}

export async function generateWorkoutConversationReply(input: {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  savedCoachNotes: unknown;
  userMessage: string;
}) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return { ok: false as const, error: "Missing OpenAI API key" };
    const client = new OpenAI({ apiKey });

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      input: [
        { role: "system", content: CONVERSATIONAL_COACH_PROMPT },
        ...input.messages,
      ],
    });

    const message = response.output_text?.trim();
    if (!message) return { ok: false as const, error: "Empty coach reply" };
    return { ok: true as const, model: response.model, message };
  } catch {
    return {
      ok: true as const,
      model: "fallback-chat-rules",
      message: buildFallbackReply({
        userMessage: input.userMessage,
        workoutContext: {},
        savedCoachNotes: input.savedCoachNotes,
      }),
    };
  }
}
