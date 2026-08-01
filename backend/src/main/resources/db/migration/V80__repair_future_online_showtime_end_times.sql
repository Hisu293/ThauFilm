-- Repair online showtimes created before duration changes were synchronized.
-- Physical-room showtimes are intentionally left for an admin-confirmed update
-- because changing them automatically could introduce room conflicts.
UPDATE showtime s
SET end_time = s.start_time + (m.duration_minutes + 1) * INTERVAL '1 minute'
FROM movies m
WHERE s.movie_id = m.id
  AND s.online = TRUE
  AND s.status <> 'CANCELLED'
  AND s.end_time > (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')
  AND s.end_time <> s.start_time + (m.duration_minutes + 1) * INTERVAL '1 minute';
