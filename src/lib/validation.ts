import { z } from "zod";

export const setSchema = z.object({
  template_exercise_id: z.string().uuid(),
  set_number: z.number().int().positive(),
  target_weight: z.number().nonnegative(),
  actual_weight: z.number().nonnegative().optional(),
  target_reps: z.number().int().nonnegative(),
  actual_reps: z.number().int().nonnegative().optional(),
  rir: z.number().int().min(0).max(5).optional(),
  completed: z.boolean().default(false),
});

export const startWorkoutSchema = z.object({
  program_day_id: z.string().uuid(),
});

export const finishWorkoutSchema = z.object({
  workout_id: z.string().uuid(),
  difficulty: z.enum(["easy", "good", "hard", "failed"]),
  pain_level: z.enum(["none", "minor", "moderate"]),
  substitutions_text: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
  sets: z.array(setSchema),
});

export const aiUpdateSchema = z.object({
  summary_note: z.string().max(300),
  detailed_feedback: z.string().min(180).max(2400),
  next_session_focus: z.string().max(220),
  recovery_observation: z.string().max(220),
  exercises: z.array(
    z.object({
      exercise_name: z.string(),
      target_sets: z.number().int().min(1).max(10),
      rep_min: z.number().int().min(1).max(30),
      rep_max: z.number().int().min(1).max(30),
      target_weight: z.number().min(0),
      rest_seconds: z.number().int().min(30).max(600),
      cue_text: z.string().max(80),
      progression_status: z.enum(["progress", "hold", "reduce_volume", "deload"]),
      progression_reason: z.string().max(150),
    }),
  ),
});

export const generateCoachFeedbackSchema = z.object({
  workout_id: z.string().uuid(),
});

export const workoutConversationMessageSchema = z.object({
  workout_id: z.string().uuid(),
  message: z.string().min(1).max(2000),
});

export type AIUpdatePayload = z.infer<typeof aiUpdateSchema>;
