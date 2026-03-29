import {
  HYPERTROPHY_DAYS,
  MOCK_PROGRAM_GOAL,
  MOCK_PROGRAM_NAME,
} from "@/lib/hypertrophy-program-definition";

export { MOCK_PROGRAM_GOAL, MOCK_PROGRAM_NAME };

/** Offline / demo program days: order_index 1–4 (UPPER A → LOWER A → UPPER B → LOWER B). */
export const MOCK_PROGRAM_DAYS = HYPERTROPHY_DAYS.map((day) => ({
  id: day.id,
  name: day.name,
  order_index: day.order_index,
  template_exercises: day.exercises.map((ex) => ({
    id: ex.id,
    exercise_name: ex.exercise_name,
    order_index: ex.order_index,
    target_sets: ex.target_sets,
    rep_min: ex.repRangeMin,
    rep_max: ex.repRangeMax,
    repRangeMin: ex.repRangeMin,
    repRangeMax: ex.repRangeMax,
    target_weight: ex.target_weight,
    cue_text: ex.cue_text,
    rest_seconds: ex.rest_seconds,
    increment_lbs: ex.increment_lbs,
    progression_rule: ex.progression_rule,
    is_compound: ex.is_compound,
    template_sets: ex.template_sets.map((ts) => ({
      set_number: ts.set_number,
      target_weight: ts.target_weight,
      target_reps: ts.target_reps,
      rest_seconds: ts.rest_seconds,
      is_bodyweight: ts.is_bodyweight,
      note: ts.note ?? null,
      variation: ts.variation ?? null,
    })),
  })),
}));
