import type { AIUpdatePayload } from "@/lib/validation";
import { legacyDetailedFromStructured, nextFocusLinesFromArray } from "@/types/coach";

/** API JSON shape for clients (structured fields + legacy string aliases). */
export function serializeCoachApiResponse(payload: AIUpdatePayload) {
  const structured = {
    session_summary: payload.session_summary,
    exercise_adjustments: payload.exercise_adjustments,
    next_session_focus: payload.next_session_focus,
    recovery: payload.recovery,
  };
  return {
    session_summary: payload.session_summary,
    exercise_adjustments: payload.exercise_adjustments,
    next_session_focus: payload.next_session_focus,
    recovery: payload.recovery,
    exercises: payload.exercises,
    summary_note: payload.session_summary,
    detailed_feedback: legacyDetailedFromStructured(structured),
    next_session_focus_text: nextFocusLinesFromArray(payload.next_session_focus),
    recovery_observation: payload.recovery,
  };
}
