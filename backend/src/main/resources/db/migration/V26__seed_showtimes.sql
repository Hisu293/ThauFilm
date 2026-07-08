-- V26: Seed data for showtimes (next 7 days)
-- Room 1: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa (Movie 1, 2, 3)
-- Room 2: bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb (Movie 4, 5)
-- Room 3: cccccccc-cccc-cccc-cccc-cccccccccccc (Movie 6, 7)

INSERT INTO showtime (id, movie_id, cinema_room_id, start_time, end_time, status)
-- Room 1 showtimes (today)
SELECT 
    gen_random_uuid(),
    'a0000001-0000-0000-0000-000000000001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    (CURRENT_DATE + (h.hour || ' hours')::interval)::timestamp,
    (CURRENT_DATE + (h.hour || ' hours')::interval + '3 hours 12 minutes'::interval)::timestamp,
    1
FROM generate_series(10, 20, 3) AS h(hour);

-- Room 2 showtimes (today)
INSERT INTO showtime (id, movie_id, cinema_room_id, start_time, end_time, status)
SELECT 
    gen_random_uuid(),
    'a0000002-0000-0000-0000-000000000002',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    (CURRENT_DATE + (h.hour || ' hours')::interval)::timestamp,
    (CURRENT_DATE + (h.hour || ' hours')::interval + '3 hours'::interval)::timestamp,
    1
FROM generate_series(9, 21, 3) AS h(hour);

-- Room 3 showtimes (today)
INSERT INTO showtime (id, movie_id, cinema_room_id, start_time, end_time, status)
SELECT 
    gen_random_uuid(),
    'a0000003-0000-0000-0000-000000000003',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    (CURRENT_DATE + (h.hour || ' hours')::interval)::timestamp,
    (CURRENT_DATE + (h.hour || ' hours')::interval + '2 hours 46 minutes'::interval)::timestamp,
    1
FROM generate_series(11, 19, 2) AS h(hour);

-- Tomorrow showtimes
INSERT INTO showtime (id, movie_id, cinema_room_id, start_time, end_time, status)
SELECT 
    gen_random_uuid(),
    'a0000004-0000-0000-0000-000000000004',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    ((CURRENT_DATE + 1) + (h.hour || ' hours')::interval)::timestamp,
    ((CURRENT_DATE + 1) + (h.hour || ' hours')::interval + '1 hour 56 minutes'::interval)::timestamp,
    1
FROM generate_series(10, 18, 2) AS h(hour);
