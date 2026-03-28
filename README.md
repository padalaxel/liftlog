# LiftLog Coach MVP

Mobile-first workout logger with a conservative AI coach layer.

## Stack
- Next.js App Router + TypeScript + Tailwind
- Supabase (auth + Postgres)
- OpenAI Responses API + structured JSON
- PWA manifest + service worker registration

## Setup
1. `cp .env.example .env.local`
2. Fill Supabase and OpenAI values in `.env.local`
3. Run Supabase SQL:
   - `supabase/migrations/20260326_init_workout_mvp.sql`
   - `supabase/seed.sql` (replace placeholder user id first)
4. `npm install`
5. `npm run dev`
6. Open `http://localhost:3000`

## Core Routes
- `/auth` minimal email/password auth
- `/programs` day list + editor
- `/today` Strong-like set logging flow
- `/history` past workout list + details
- `/exercises/[name]` recent exercise history view

## API
- `POST /api/workouts/start`
- `POST /api/workouts/finish`
- `POST /api/ai/update-next-session`
- `POST /api/rest-timer/start`
- `GET /api/programs`
- `GET /api/history`

## Notes
- Database is source of truth.
- AI updates are validated with Zod before applying.
- AI failure never blocks workout save.
