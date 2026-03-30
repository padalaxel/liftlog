-- Adds Chest Fly (Dumbbell) to UPPER A for reconstructed history imports (idempotent per program day).
with next_order as (
  select
    pd.id as program_day_id,
    coalesce(max(te.order_index), 0) + 1 as next_idx
  from program_days pd
  left join template_exercises te on te.program_day_id = pd.id
  where pd.name = 'UPPER A'
  group by pd.id
),
ins as (
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
    no.program_day_id,
    'Chest Fly (Dumbbell)',
    no.next_idx,
    3,
    12,
    15,
    25,
    2.5,
    60,
    null,
    'hold_then_progress',
    false
  from next_order no
  where not exists (
    select 1
    from template_exercises te
    where te.program_day_id = no.program_day_id
      and te.exercise_name = 'Chest Fly (Dumbbell)'
  )
  returning id, program_day_id
)
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
  ins.id,
  gs.n::int,
  25,
  15,
  60,
  false,
  null,
  null
from ins
cross join lateral generate_series(1, 3) as gs(n)
where not exists (
  select 1 from template_sets ts
  where ts.template_exercise_id = ins.id
);
