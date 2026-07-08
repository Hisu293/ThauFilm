-- V33: Reassign seat types for Phòng 1 (aaaaaaaa) to match realistic cinema layout
-- Row A-B: STANDARD (front)
-- Row E-F: COUPLE (middle)
-- Row H-I: VIP (back)
-- Row C-D, G, J: STANDARD

UPDATE seat
SET type = CASE
    WHEN row_name IN ('A', 'B') THEN 'STANDARD'
    WHEN row_name IN ('E', 'F') THEN 'COUPLE'
    WHEN row_name IN ('H', 'I') THEN 'VIP'
    ELSE 'STANDARD'
END
WHERE cinema_room_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  AND type IS DISTINCT FROM CASE
    WHEN row_name IN ('A', 'B') THEN 'STANDARD'
    WHEN row_name IN ('E', 'F') THEN 'COUPLE'
    WHEN row_name IN ('H', 'I') THEN 'VIP'
    ELSE 'STANDARD'
END;
