import type { CoachContext } from "@/lib/ai/buildCoachContext";

type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

const MAX_TOTAL_CHARS = 18000;

function toJson(value: unknown) {
  return JSON.stringify(value);
}

function estimateSize(messages: Message[]) {
  return messages.reduce((acc, msg) => acc + msg.content.length, 0);
}

export function buildCoachMessages(context: CoachContext, userMessage?: string): Message[] {
  const reducedContext: CoachContext = {
    ...context,
    recent_workouts: context.recent_workouts.slice(0, 6),
    conversation_context: context.conversation_context.slice(-12),
  };

  const baseMessages: Message[] = [
    {
      role: "system",
      content: `Coach style: ${reducedContext.system_context.coach_style}
Priorities: ${reducedContext.system_context.priorities.join(", ")}
Tone rules: ${reducedContext.system_context.tone_rules.join(", ")}`,
    },
    { role: "system", content: `workout_context=${toJson(reducedContext.workout_context)}` },
    { role: "system", content: `program_context=${toJson(reducedContext.program_context)}` },
    { role: "system", content: `recent_workouts=${toJson(reducedContext.recent_workouts)}` },
  ];

  const conversationMessages: Message[] = reducedContext.conversation_context.map((msg) => ({
    role: msg.role,
    content: msg.message,
  }));

  let messages = [...baseMessages, ...conversationMessages];
  if (userMessage) messages.push({ role: "user", content: userMessage });

  while (estimateSize(messages) > MAX_TOTAL_CHARS && reducedContext.recent_workouts.length > 2) {
    reducedContext.recent_workouts = reducedContext.recent_workouts.slice(
      0,
      reducedContext.recent_workouts.length - 1,
    );
    messages = [
      baseMessages[0],
      baseMessages[1],
      baseMessages[2],
      { role: "system", content: `recent_workouts=${toJson(reducedContext.recent_workouts)}` },
      ...conversationMessages,
      ...(userMessage ? [{ role: "user" as const, content: userMessage }] : []),
    ];
  }

  while (estimateSize(messages) > MAX_TOTAL_CHARS && reducedContext.conversation_context.length > 4) {
    reducedContext.conversation_context = reducedContext.conversation_context.slice(
      2,
      reducedContext.conversation_context.length,
    );
    messages = [
      baseMessages[0],
      baseMessages[1],
      baseMessages[2],
      { role: "system", content: `recent_workouts=${toJson(reducedContext.recent_workouts)}` },
      ...reducedContext.conversation_context.map((msg) => ({
        role: msg.role,
        content: msg.message,
      })),
      ...(userMessage ? [{ role: "user" as const, content: userMessage }] : []),
    ];
  }

  return messages;
}
