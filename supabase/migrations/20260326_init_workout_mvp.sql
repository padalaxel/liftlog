create extension if not exists "pgcrypto";

create table if not exists programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  goal text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists program_days (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs(id) on delete cascade,
  name text not null,
  order_index int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists template_exercises (
  id uuid primary key default gen_random_uuid(),
  program_day_id uuid not null references program_days(id) on delete cascade,
  exercise_name text not null,
  order_index int not null,
  target_sets int not null,
  rep_min int not null,
  rep_max int not null,
  target_weight numeric not null default 0,
  increment_lbs numeric not null default 5,
  rest_seconds int not null default 120,
  cue_text text,
  progression_rule text not null check (progression_rule in ('double_progression','hold_then_progress','deload_on_failure')),
  is_compound boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_day_id uuid not null references program_days(id) on delete restrict,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_seconds int,
  difficulty text check (difficulty in ('easy','good','hard','failed')),
  pain_level text check (pain_level in ('none','minor','moderate')),
  substitutions_text text,
  notes text,
  ai_summary_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references workouts(id) on delete cascade,
  template_exercise_id uuid not null references template_exercises(id) on delete restrict,
  set_number int not null,
  target_weight numeric not null default 0,
  actual_weight numeric,
  target_reps int not null default 0,
  actual_reps int,
  rir int,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ai_updates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_workout_id uuid not null references workouts(id) on delete cascade,
  target_program_day_id uuid not null references program_days(id) on delete cascade,
  model_name text not null,
  request_payload jsonb not null,
  response_payload jsonb not null,
  applied_successfully boolean not null default false,
  created_at timestamptz not null default now()
);

alter table programs enable row level security;
alter table program_days enable row level security;
alter table template_exercises enable row level security;
alter table workouts enable row level security;
alter table workout_sets enable row level security;
alter table ai_updates enable row level security;

create policy "users own programs" on programs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users own workouts" on workouts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users own ai_updates" on ai_updates for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users own program_days" on program_days for all
using (exists (select 1 from programs p where p.id = program_id and p.user_id = auth.uid()))
with check (exists (select 1 from programs p where p.id = program_id and p.user_id = auth.uid()));

create policy "users own template_exercises" on template_exercises for all
using (exists (
  select 1 from program_days d join programs p on p.id = d.program_id
  where d.id = program_day_id and p.user_id = auth.uid()
))
with check (exists (
  select 1 from program_days d join programs p on p.id = d.program_id
  where d.id = program_day_id and p.user_id = auth.uid()
));

create policy "users own workout_sets" on workout_sets for all
using (exists (select 1 from workouts w where w.id = workout_id and w.user_id = auth.uid()))
with check (exists (select 1 from workouts w where w.id = workout_id and w.user_id = auth.uid()));
