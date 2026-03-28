import OpenAI from "openai";

import { STRUCTURED_COACH_PROMPT } from "@/lib/ai/structuredCoachPrompt";
import { AIUpdatePayload, aiUpdateSchema } from "@/lib/validation";

type CoachMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function generateNextSessionUpdate(messages: CoachMessage[]): Promise<{
  ok: true;
  data: AIUpdatePayload;
  model: string;
} | {
  ok: false;
  error: string;
}> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return { ok: false, error: "Missing OpenAI API key" };
    const client = new OpenAI({ apiKey });

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      input: [
        { role: "system", content: STRUCTURED_COACH_PROMPT },
        ...messages,
        { role: "user", content: "Generate structured coaching update JSON now." },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "next_session_update",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              summary_note: { type: "string" },
              exercises: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    exercise_name: { type: "string" },
                    target_sets: { type: "integer" },
                    rep_min: { type: "integer" },
                    rep_max: { type: "integer" },
                    target_weight: { type: "number" },
                    rest_seconds: { type: "integer" },
                    cue_text: { type: "string" },
                    progression_status: {
                      type: "string",
                      enum: ["progress", "hold", "reduce_volume", "deload"],
                    },
                    progression_reason: { type: "string" },
                  },
                  required: [
                    "exercise_name",
                    "target_sets",
                    "rep_min",
                    "rep_max",
                    "target_weight",
                    "rest_seconds",
                    "cue_text",
                    "progression_status",
                    "progression_reason",
                  ],
                },
              },
              detailed_feedback: { type: "string" },
              next_session_focus: { type: "string" },
              recovery_observation: { type: "string" },
            },
            required: [
              "summary_note",
              "detailed_feedback",
              "next_session_focus",
              "recovery_observation",
              "exercises",
            ],
          },
        },
      },
    });

    if (response.error) {
      return {
        ok: false,
        error: response.error.message ?? "OpenAI returned an error for this response",
      };
    }

    const raw = response.output_text;
    if (!raw?.trim()) {
      return { ok: false, error: "Empty model output" };
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch {
      return { ok: false, error: "Model output was not valid JSON" };
    }

    const parsed = aiUpdateSchema.safeParse(parsedJson);
    if (!parsed.success) {
      return { ok: false, error: "Invalid AI response format" };
    }

    const modelLabel =
      (typeof response.model === "string" && response.model.length > 0
        ? response.model
        : null) ?? process.env.OPENAI_MODEL ?? "gpt-4.1-mini";

    return {
      ok: true,
      data: parsed.data,
      model: modelLabel,
    };
  } catch (err) {
    console.error("[generateNextSessionUpdate]", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not generate update",
    };
  }
}
