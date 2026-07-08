-- V29: Seed seat_availabilities from showtimes
-- This creates seat availability records for all seats in rooms that have showtimes

-- Get all showtimes and their rooms, then create seat availabilities
INSERT INTO seat_availabilities (id, showtime_id, seat_id, available, price)
SELECT 
    gen_random_uuid(),
    s.id,
    st.id,
    true,
    CASE 
        WHEN st.type = 'VIP' THEN 95000
        WHEN st.type = 'COUPLE' THEN 130000
        ELSE 75000
    END
FROM showtime s
CROSS JOIN seat st
WHERE st.cinema_room_id = s.cinema_room_id
ON CONFLICT (showtime_id, seat_id) DO NOTHING;
