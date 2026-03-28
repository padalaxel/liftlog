-- Per-set template targets (weight, reps, rest, notes, variation, bodyweight).
create table if not exists template_sets (
  id uuid primary key default gen_random_uuid(),
  template_exercise_id uuid not null references template_exercises(id) on delete cascade,
  set_number int not null check (set_number >= 1 and set_number <= 20),
  target_weight numeric,
  target_reps int not null default 0 check (target_reps >= 0),
  rest_seconds int,
  is_bodyweight boolean not null default false,
  note text,
  variation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (template_exercise_id, set_number)
);

create index if not exists idx_template_sets_template_exercise_id
  on template_sets(template_exercise_id);

alter table template_sets enable row level security;

create policy "users own template_sets" on template_sets for all
using (exists (
  select 1 from template_exercises te
  join program_days pd on pd.id = te.program_day_id
  join programs p on p.id = pd.program_id
  where te.id = template_exercise_id and p.user_id = auth.uid()
))
with check (exists (
  select 1 from template_exercises te
  join program_days pd on pd.id = te.program_day_id
  join programs p on p.id = pd.program_id
  where te.id = template_exercise_id and p.user_id = auth.uid()
));
