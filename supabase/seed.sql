-- Replace seed UUID with a real auth.users id before running against a non-local user.
-- Idempotent: deletes prior programs for the seed user, then inserts the Hypertrophy template.

delete from workouts
where user_id = 'ffae43ab-fa18-4e98-a5f0-23957e96d2ef'::uuid;

delete from programs
where user_id = 'ffae43ab-fa18-4e98-a5f0-23957e96d2ef'::uuid;

insert into programs (user_id, name, goal, is_active)
values (
  'ffae43ab-fa18-4e98-a5f0-23957e96d2ef'::uuid,
  'Hypertrophy',
  'Four-day upper/lower split (UPPER A → LOWER A → UPPER B → LOWER B). Progression is exercise-specific.',
  true
);

insert into program_days (program_id, name, order_index)
select p.id, x.name, x.ord
from programs p
cross join (
  values
    ('UPPER A', 1),
    ('LOWER A (Knee Friendly)', 2),
    ('UPPER B', 3),
    ('LOWER B', 4)
) as x(name, ord)
where p.user_id = 'ffae43ab-fa18-4e98-a5f0-23957e96d2ef'::uuid
  and p.name = 'Hypertrophy';

insert into template_exercises (
  program_day_id,
  exercise_name,
  order_index,
  target_sets,
  rep_min,
  rep_max,
  target_weight,
  increment_lbs,
  rest_seconds,
  cue_text,
  progression_rule,
  is_compound
)
select
  pd.id,
  v.exercise_name,
  v.ex_order,
  v.target_sets,
  v.rep_min,
  v.rep_max,
  v.target_weight,
  v.increment_lbs,
  v.rest_seconds,
  v.cue_text,
  v.progression_rule,
  v.is_compound
from program_days pd
join programs p on p.id = pd.program_id
join (
  values
    ('UPPER A', 1, 'Bench Press (Barbell)', 4, 5, 8, 185::numeric, 5::numeric, 90, null::text, 'double_progression', true),
    ('UPPER A', 2, 'Seated Row (Cable)', 3, 8, 12, 120::numeric, 5::numeric, 75, null, 'double_progression', true),
    ('UPPER A', 3, 'Incline Bench Press (Dumbbell)', 3, 8, 10, 55::numeric, 5::numeric, 90, null, 'double_progression', true),
    ('UPPER A', 4, 'Lateral Raise (Dumbbell)', 3, 12, 15, 20::numeric, 2.5::numeric, 60, null, 'hold_then_progress', false),
    ('UPPER A', 5, 'Triceps Pushdown (Cable)', 3, 10, 12, 45::numeric, 5::numeric, 75, null, 'hold_then_progress', false),

    ('LOWER A (Knee Friendly)', 1, 'Leg Press', 4, 10, 12, 270::numeric, 10::numeric, 70, null, 'double_progression', true),
    ('LOWER A (Knee Friendly)', 2, 'Glute Bridge', 3, 8, 12, 95::numeric, 5::numeric, 55, '2-3 second squeeze at top', 'double_progression', true),
    ('LOWER A (Knee Friendly)', 3, 'Back Extension', 3, 12, 15, 45::numeric, 5::numeric, 80, null, 'hold_then_progress', false),
    ('LOWER A (Knee Friendly)', 4, 'Leg Extension (Machine)', 3, 10, 15, 65::numeric, 5::numeric, 80, null, 'hold_then_progress', false),
    ('LOWER A (Knee Friendly)', 5, 'Lying Leg Curl (Machine)', 3, 10, 15, 55::numeric, 5::numeric, 55, null, 'hold_then_progress', false),
    ('LOWER A (Knee Friendly)', 6, 'Knee Raise (Captain''s Chair)', 3, 12, 15, 0::numeric, 0::numeric, 75, null, 'hold_then_progress', false),
    ('LOWER A (Knee Friendly)', 7, 'Cable Twist', 3, 12, 15, 25::numeric, 2.5::numeric, 55, '12-15 reps per side', 'hold_then_progress', false),

    ('UPPER B', 1, 'Lat Pulldown (Cable)', 3, 8, 12, 140::numeric, 5::numeric, 75, 'Neutral grip', 'double_progression', true),
    ('UPPER B', 2, 'Bench Press (Dumbbell)', 3, 8, 10, 60::numeric, 5::numeric, 90, 'Pause at bottom only', 'double_progression', true),
    ('UPPER B', 3, 'Seated Row (Cable)', 3, 8, 12, 120::numeric, 5::numeric, 75, null, 'double_progression', true),
    ('UPPER B', 4, 'Hammer Curl (Dumbbell)', 3, 8, 10, 35::numeric, 2.5::numeric, 75, null, 'hold_then_progress', false),
    ('UPPER B', 5, 'Triceps Pushdown (Cable - Straight Bar)', 3, 10, 12, 45::numeric, 5::numeric, 75, null, 'hold_then_progress', false),
    ('UPPER B', 6, 'Reverse Fly (Dumbbell)', 3, 12, 15, 15::numeric, 2.5::numeric, 60, null, 'hold_then_progress', false),

    ('LOWER B', 1, 'Romanian Deadlift (Barbell)', 4, 6, 10, 185::numeric, 5::numeric, 80, null, 'double_progression', true),
    ('LOWER B', 2, 'Hip Thrust (Barbell)', 3, 8, 12, 185::numeric, 10::numeric, 90, null, 'double_progression', true),
    ('LOWER B', 3, 'Lying Leg Curl (Machine)', 3, 10, 15, 55::numeric, 5::numeric, 55, null, 'hold_then_progress', false),
    ('LOWER B', 4, 'Leg Extension (Machine)', 3, 10, 15, 65::numeric, 5::numeric, 55, null, 'hold_then_progress', false),
    ('LOWER B', 5, 'Leg Press', 3, 10, 15, 290::numeric, 10::numeric, 70, null, 'double_progression', true),
    ('LOWER B', 6, 'Standing Calf Raise (Dumbbell)', 3, 12, 20, 40::numeric, 5::numeric, 45, null, 'hold_then_progress', false),
    ('LOWER B', 7, 'Hanging Leg Raise', 3, 10, 15, 0::numeric, 0::numeric, 45, 'Think "curl spine"', 'hold_then_progress', false)
) as v(
  day_name,
  ex_order,
  exercise_name,
  target_sets,
  rep_min,
  rep_max,
  target_weight,
  increment_lbs,
  rest_seconds,
  cue_text,
  progression_rule,
  is_compound
) on pd.name = v.day_name
where p.user_id = 'ffae43ab-fa18-4e98-a5f0-23957e96d2ef'::uuid
  and p.name = 'Hypertrophy';

insert into template_sets (
  template_exercise_id,
  set_number,
  target_weight,
  target_reps,
  rest_seconds,
  is_bodyweight,
  note,
  variation
)
select
  te.id,
  gs.n::int,
  case
    when te.exercise_name in ('Knee Raise (Captain''s Chair)', 'Hanging Leg Raise') then null
    else te.target_weight
  end,
  te.rep_max,
  te.rest_seconds,
  te.exercise_name in ('Knee Raise (Captain''s Chair)', 'Hanging Leg Raise'),
  null,
  null
from template_exercises te
join program_days pd on pd.id = te.program_day_id
join programs p on p.id = pd.program_id
cross join lateral generate_series(1, te.target_sets) as gs(n)
where p.user_id = 'ffae43ab-fa18-4e98-a5f0-23957e96d2ef'::uuid
  and p.name = 'Hypertrophy';

update programs
set is_active = case when name = 'Hypertrophy' then true else false end
where user_id = 'ffae43ab-fa18-4e98-a5f0-23957e96d2ef'::uuid;
