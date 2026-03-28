export type Difficulty = "easy" | "good" | "hard" | "failed";
export type PainLevel = "none" | "minor" | "moderate";
export type ProgressionRule =
  | "double_progression"
  | "hold_then_progress"
  | "deload_on_failure";

export type ProgressionStatus = "hold_weight" | "add_weight" | "reduce_volume";

export type Program = {
  id: string;
  user_id: string;
  name: string;
  goal: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProgramDay = {
  id: string;
  program_id: string;
  name: string;
  order_index: number;
  created_at: string;
  updated_at: string;
};

export type TemplateSet = {
  id: string;
  template_exercise_id: string;
  set_number: number;
  target_weight: number | null;
  target_reps: number;
  rest_seconds: number | null;
  is_bodyweight: boolean;
  note: string | null;
  variation: string | null;
  created_at?: string;
  updated_at?: string;
};

export type TemplateExercise = {
  id: string;
  program_day_id: string;
  exercise_name: string;
  order_index: number;
  target_sets: number;
  rep_min: number;
  rep_max: number;
  target_weight: number;
  increment_lbs: number;
  rest_seconds: number;
  cue_text: string | null;
  progression_rule: ProgressionRule;
  is_compound: boolean;
  created_at: string;
  updated_at: string;
  template_sets?: TemplateSet[];
};
