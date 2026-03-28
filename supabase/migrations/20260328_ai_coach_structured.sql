alter table workouts
  add column if not exists ai_coach_structured jsonb;
