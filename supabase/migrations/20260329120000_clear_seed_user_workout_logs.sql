-- Remove completed workout rows for the local seed user only (clears demo/test session logs).
delete from workouts
where user_id = 'ffae43ab-fa18-4e98-a5f0-23957e96d2ef'::uuid;
