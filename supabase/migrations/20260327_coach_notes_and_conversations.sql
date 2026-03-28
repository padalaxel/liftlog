alter table workouts
  add column if not exists ai_detailed_feedback text,
  add column if not exists ai_next_session_focus text,
  add column if not exists ai_recovery_observation text;

create table if not exists workout_conversations (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references workouts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_workout_conversations_workout_id
  on workout_conversations(workout_id);
create index if not exists idx_workout_conversations_user_id
  on workout_conversations(user_id);
create index if not exists idx_workout_conversations_created_at
  on workout_conversations(created_at);

alter table workout_conversations enable row level security;

create policy "users own workout_conversations" on workout_conversations
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
