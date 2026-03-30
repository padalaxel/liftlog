-- Lightweight metadata for reconstructed / seeded history (does not alter existing rows).
alter table workouts
  add column if not exists imported boolean not null default false,
  add column if not exists source text,
  add column if not exists reconstruction_seed_key text;

alter table workout_sets
  add column if not exists imported boolean not null default false,
  add column if not exists source text;

comment on column workouts.imported is 'True when workout was inserted by a seed/import, not live logging.';
comment on column workouts.source is 'Import origin, e.g. reconstructed_history_seed.';
comment on column workouts.reconstruction_seed_key is 'Stable idempotency key for a given reconstructed session; unique per user when set.';

create unique index if not exists workouts_user_reconstruction_seed_key
  on workouts (user_id, reconstruction_seed_key)
  where reconstruction_seed_key is not null;
