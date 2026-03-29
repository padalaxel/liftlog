-- One-time: clear workout rows for the repo’s sample seed UUID only.
-- For your real account, use Settings → “Clear all workout history” or POST /api/workouts/clear-history.
delete from workouts
where user_id = 'ffae43ab-fa18-4e98-a5f0-23957e96d2ef'::uuid;
