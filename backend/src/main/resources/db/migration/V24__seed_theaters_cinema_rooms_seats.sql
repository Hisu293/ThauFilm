-- V24: Seed data for theaters
INSERT INTO theaters (id, name, address, city, phone_number, status) VALUES
('11111111-1111-1111-1111-111111111111', 'FilmTicket Cinema Quận 1', '123 Đường Nguyễn Huệ, Quận 1', 'TP. Hồ Chí Minh', '02812345678', 1),
('22222222-2222-2222-2222-222222222222', 'FilmTicket Cinema Quận 3', '456 Đường Điện Biên Phủ, Quận 3', 'TP. Hồ Chí Minh', '02823456789', 1),
('33333333-3333-3333-3333-333333333333', 'FilmTicket Cinema Hà Nội', '789 Đường Trần Duy Hưng, Cầu Giấy', 'Hà Nội', '02434567890', 1)
ON CONFLICT DO NOTHING;

-- V24: Seed data for cinema_rooms
INSERT INTO cinema_room (id, name, capacity, status, theater_id) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Phòng 1 - Standard', 100, 1, '11111111-1111-1111-1111-111111111111'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Phòng 2 - VIP', 60, 1, '11111111-1111-1111-1111-111111111111'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Phòng 3 - Couple', 40, 1, '11111111-1111-1111-1111-111111111111'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Phòng A - Standard', 80, 1, '22222222-2222-2222-2222-222222222222'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Phòng B - VIP', 50, 1, '22222222-2222-2222-2222-222222222222'),
('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Phòng S1 - Standard', 90, 1, '33333333-3333-3333-3333-333333333333'),
('10101010-1010-1010-1010-101010101010', 'Phòng S2 - VIP', 55, 1, '33333333-3333-3333-3333-333333333333')
ON CONFLICT DO NOTHING;

-- V24: Seed data for seats (Room 1 - 10x10 seats)
INSERT INTO seat (id, cinema_room_id, row_name, seat_number, type, status)
SELECT 
    gen_random_uuid(),
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    chr(65 + (row_num - 1)::int),
    seat_num,
    CASE 
        WHEN row_num <= 1 THEN 'STANDARD'
        WHEN row_num <= 3 THEN 'VIP'
        WHEN row_num <= 5 THEN 'COUPLE'
        ELSE 'STANDARD'
    END,
    1
FROM generate_series(1, 10) AS row_num
CROSS JOIN generate_series(1, 10) AS seat_num
ON CONFLICT (cinema_room_id, row_name, seat_number) DO NOTHING;
