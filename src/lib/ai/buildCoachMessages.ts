import type { CoachContext } from "@/lib/ai/buildCoachContext";
import {
  COACH_EXERCISE_SESSION_LIMIT,
  COACH_PROGRAM_WORKOUT_HISTORY_LIMIT,
} from "@/lib/ai/buildCoachContext";

type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

const MAX_TOTAL_CHARS = 22000;

function toJson(value: unknown) {
  return JSON.stringify(value);
}

function estimateSize(messages: Message[]) {
  return messages.reduce((acc, msg) => acc + msg.content.length, 0);
}

function systemCoachBlock(ctx: CoachContext) {
  return `Coach style: ${ctx.system_context.coach_style}
Priorities: ${ctx.system_context.priorities.join(", ")}
Tone rules: ${ctx.system_context.tone_rules.join(", ")}
History rules: ${ctx.system_context.history_usage_rules.join(" ")}`;
}

function assembleMessages(reduced: CoachContext, userMessage?: string): Message[] {
  const conv = reduced.conversation_context.map((msg) => ({
    role: msg.role,
    content: msg.message,
  }));
  return [
    { role: "system", content: systemCoachBlock(reduced) },
    { role: "system", content: `workout_context=${toJson(reduced.workout_context)}` },
    { role: "system", content: `program_context=${toJson(reduced.program_context)}` },
    { role: "system", content: `exercise_history=${toJson(reduced.exercise_history)}` },
    {
      role: "system",
      content: `program_workout_history=${toJson(reduced.program_workout_history)}`,
    },
    ...conv,
    ...(userMessage ? [{ role: "user" as const, content: userMessage }] : []),
  ];
}

export function buildCoachMessages(context: CoachContext, userMessage?: string): Message[] {
  let reduced: CoachContext = {
    ...context,
    exercise_history: context.exercise_history.map((b) => ({
      ...b,
      sessions: b.sessions.slice(0, COACH_EXERCISE_SESSION_LIMIT),
    })),
    program_workout_history: context.program_workout_history.slice(
      0,
      COACH_PROGRAM_WORKOUT_HISTORY_LIMIT,
    ),
    conversation_context: context.conversation_context.slice(-12),
  };

  let messages = assembleMessages(reduced, userMessage);

  while (estimateSize(messages) > MAX_TOTAL_CHARS && reduced.exercise_history.some((b) => b.sessions.length > 3)) {
    reduced = {
      ...reduced,
      exercise_history: reduced.exercise_history.map((b) => ({
        ...b,
        sessions: b.sessions.slice(0, 3),
      })),
    };
    messages = assembleMessages(reduced, userMessage);
  }

  while (estimateSize(messages) > MAX_TOTAL_CHARS && reduced.program_workout_history.length > 6) {
    reduced = {
      ...reduced,
      program_workout_history: reduced.program_workout_history.slice(
        0,
        reduced.program_workout_history.length - 1,
      ),
    };
    messages = assembleMessages(reduced, userMessage);
  }

  while (estimateSize(messages) > MAX_TOTAL_CHARS && reduced.exercise_history.some((b) => b.sessions.length > 2)) {
    reduced = {
      ...reduced,
      exercise_history: reduced.exercise_history.map((b) => ({
        ...b,
        sessions: b.sessions.slice(0, 2),
      })),
    };
    messages = assembleMessages(reduced, userMessage);
  }

  while (estimateSize(messages) > MAX_TOTAL_CHARS && reduced.conversation_context.length > 4) {
    reduced = {
      ...reduced,
      conversation_context: reduced.conversation_context.slice(2),
    };
    messages = assembleMessages(reduced, userMessage);
  }

  return messages;
}
