-- Replace this UUID with a real auth.users id before running.
-- This seed is idempotent for one base template: UPPER A.
with seed_user as (
  select 'ffae43ab-fa18-4e98-a5f0-23957e96d2ef'::uuid as user_id
),
upper_a_program as (
  insert into programs (user_id, name, goal, is_active)
  select user_id, 'UPPER A', 'Upper body hypertrophy day', true
  from seed_user
  where not exists (
    select 1
    from programs p
    where p.user_id = seed_user.user_id
      and lower(p.name) = 'upper a'
  )
  returning id
),
resolved_program as (
  select id from upper_a_program
  union all
  select p.id
  from programs p
  join seed_user su on su.user_id = p.user_id
  where lower(p.name) = 'upper a'
  limit 1
),
upper_a_day as (
  insert into program_days (program_id, name, order_index)
  select rp.id, 'UPPER A', 1
  from resolved_program rp
  where not exists (
    select 1
    from program_days d
    where d.program_id = rp.id
      and lower(d.name) = 'upper a'
  )
  returning id
),
resolved_day as (
  select id from upper_a_day
  union all
  select d.id
  from program_days d
  join resolved_program rp on rp.id = d.program_id
  where lower(d.name) = 'upper a'
  limit 1
),
cleared as (
  delete from template_exercises te
  using resolved_day rd
  where te.program_day_id = rd.id
  returning te.id
)
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
  rd.id,
  x.exercise_name,
  x.order_index,
  x.target_sets,
  x.rep_min,
  x.rep_max,
  x.target_weight,
  x.increment_lbs,
  x.rest_seconds,
  x.cue_text,
  x.progression_rule,
  x.is_compound
from resolved_day rd
cross join (
  values
    ('Bench Press (Barbell)', 1, 4, 5, 8, 165::numeric, 5::numeric, 85, 'Pause on chest • Hold weight', 'double_progression', true),
    ('Seated Row (Cable)', 2, 3, 10, 12, 115::numeric, 5::numeric, 65, 'Drive elbows low • Hold weight', 'double_progression', true),
    ('Incline Bench Press (Dumbbell)', 3, 3, 8, 10, 50::numeric, 5::numeric, 65, '30 degree incline • Rest sets 2-3: 85s', 'double_progression', true),
    ('Lateral Raise (Dumbbell)', 4, 3, 12, 15, 17.5::numeric, 2.5::numeric, 55, null, 'hold_then_progress', false),
    ('Triceps Pushdown (Cable - Straight Bar)', 5, 3, 10, 12, 45::numeric, 5::numeric, 60, 'Per-set rest: 60s / 40s / 60s', 'hold_then_progress', false),
    ('Chest Fly', 6, 3, 10, 12, 25::numeric, 2.5::numeric, 55, null, 'hold_then_progress', false),
    ('Hammer Curl (Dumbbell)', 7, 3, 10, 12, 30::numeric, 2.5::numeric, 65, null, 'hold_then_progress', false),
    ('Hanging Leg Raise', 8, 3, 14, 15, 0::numeric, 0::numeric, 45, 'Think curl spine • Bodyweight', 'hold_then_progress', false),
    ('Cable Twist', 9, 3, 10, 12, 10::numeric, 2.5::numeric, 55, 'Set targets: 12, 0, 0', 'hold_then_progress', false)
) as x(
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
);

-- Keep only UPPER A active for this seeded user.
update programs
set is_active = case when lower(name) = 'upper a' then true else false end
where user_id = 'ffae43ab-fa18-4e98-a5f0-23957e96d2ef'::uuid;

-- Optional per-set seed data for installations that include template_sets conventions.
do $$
declare
  has_template_sets boolean;
  has_required_columns boolean;
begin
  has_template_sets := to_regclass('public.template_sets') is not null;

  if not has_template_sets then
    return;
  end if;

  select count(*) = 8
  into has_required_columns
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'template_sets'
    and column_name in (
      'template_exercise_id',
      'set_number',
      'target_weight',
      'target_reps',
      'rest_seconds',
      'is_bodyweight',
      'note',
      'variation'
    );

  if not has_required_columns then
    return;
  end if;

  delete from template_sets ts
  using programs p, program_days pd, template_exercises te
  where ts.template_exercise_id = te.id
    and te.program_day_id = pd.id
    and pd.program_id = p.id
    and p.user_id = 'ffae43ab-fa18-4e98-a5f0-23957e96d2ef'::uuid
    and lower(p.name) = 'upper a'
    and lower(pd.name) = 'upper a';

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
    s.set_number,
    s.target_weight,
    s.target_reps,
    s.rest_seconds,
    s.is_bodyweight,
    s.note,
    s.variation
  from programs p
  join program_days pd on pd.program_id = p.id and lower(pd.name) = 'upper a'
  join template_exercises te on te.program_day_id = pd.id
  join lateral (
    select * from (
      values
        ('Bench Press (Barbell)', 1, 165::numeric, 7, 85, false, 'Pause on chest', null),
        ('Bench Press (Barbell)', 2, 165::numeric, 7, 85, false, 'Hold weight', null),
        ('Bench Press (Barbell)', 3, 165::numeric, 7, 85, false, null, null),
        ('Bench Press (Barbell)', 4, 165::numeric, 6, 85, false, null, null),

        ('Seated Row (Cable)', 1, 115::numeric, 10, 65, false, 'Drive elbows low', null),
        ('Seated Row (Cable)', 2, 115::numeric, 10, 65, false, 'Hold weight', null),
        ('Seated Row (Cable)', 3, 115::numeric, 10, 65, false, null, null),

        ('Incline Bench Press (Dumbbell)', 1, 50::numeric, 10, 65, false, '30 degree incline', null),
        ('Incline Bench Press (Dumbbell)', 2, 50::numeric, 10, 85, false, null, null),
        ('Incline Bench Press (Dumbbell)', 3, 50::numeric, 8, 85, false, null, null),

        ('Lateral Raise (Dumbbell)', 1, 17.5::numeric, 12, 55, false, null, null),
        ('Lateral Raise (Dumbbell)', 2, 17.5::numeric, 10, 55, false, null, null),
        ('Lateral Raise (Dumbbell)', 3, 17.5::numeric, 10, 55, false, null, null),

        ('Triceps Pushdown (Cable - Straight Bar)', 1, 45::numeric, 10, 60, false, null, 'Straight Bar'),
        ('Triceps Pushdown (Cable - Straight Bar)', 2, 45::numeric, 9, 40, false, null, 'Straight Bar'),
        ('Triceps Pushdown (Cable - Straight Bar)', 3, 45::numeric, 6, 60, false, null, 'Straight Bar'),

        ('Chest Fly', 1, 25::numeric, 11, 55, false, null, null),
        ('Chest Fly', 2, 25::numeric, 11, 55, false, null, null),
        ('Chest Fly', 3, 25::numeric, 11, 55, false, null, null),

        ('Hammer Curl (Dumbbell)', 1, 30::numeric, 10, 65, false, null, null),
        ('Hammer Curl (Dumbbell)', 2, 30::numeric, 10, 65, false, null, null),
        ('Hammer Curl (Dumbbell)', 3, 30::numeric, 10, 65, false, null, null),

        ('Hanging Leg Raise', 1, null::numeric, 15, 45, true, 'Think curl spine', null),
        ('Hanging Leg Raise', 2, null::numeric, 15, 45, true, null, null),
        ('Hanging Leg Raise', 3, null::numeric, 14, 45, true, null, null),

        ('Cable Twist', 1, 10::numeric, 12, 55, false, null, null),
        ('Cable Twist', 2, 10::numeric, 0, 55, false, null, null),
        ('Cable Twist', 3, 10::numeric, 0, 55, false, null, null)
    ) as v(exercise_name, set_number, target_weight, target_reps, rest_seconds, is_bodyweight, note, variation)
    where v.exercise_name = te.exercise_name
  ) s on true
  where p.user_id = 'ffae43ab-fa18-4e98-a5f0-23957e96d2ef'::uuid
    and lower(p.name) = 'upper a';
end $$;
