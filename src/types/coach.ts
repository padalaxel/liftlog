import { coachStructuredPayloadSchema } from "@/lib/validation";
import type { CoachStructuredPayload } from "@/lib/validation";

export type { CoachStructuredPayload };

/** Build legacy detailed_feedback text for DB columns / old clients */
export function legacyDetailedFromStructured(s: CoachStructuredPayload): string {
  return s.exercise_adjustments
    .map(
      (ex) =>
        `${ex.exercise_name}:\n` +
        `Decision: ${ex.decision}\n` +
        `Why: ${ex.why}\n` +
        `Next session target: ${ex.next_session_target}\n` +
        `Focus: ${ex.focus}`,
    )
    .join("\n\n");
}

export function nextFocusLinesFromArray(lines: string[]): string {
  return lines.map((l) => (l.startsWith("•") ? l : `• ${l}`)).join("\n");
}

export function parseCoachStructured(raw: unknown): CoachStructuredPayload | null {
  const parsed = coachStructuredPayloadSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
