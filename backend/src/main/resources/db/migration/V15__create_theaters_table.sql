-- Create theaters table
CREATE TABLE IF NOT EXISTS theaters (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(500),
    city VARCHAR(100),
    phone_number VARCHAR(20),
    status INTEGER DEFAULT 1
);

-- Add theater_id to cinema_room table (KHÔNG có FK constraint)
ALTER TABLE cinema_room ADD COLUMN IF NOT EXISTS theater_id UUID;

-- Insert sample theaters
INSERT INTO theaters (id, name, address, city, phone_number, status) VALUES
    ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Galaxy Nguyễn Trãi', '154 Nguyễn Trãi, Quận 1', 'Hồ Chí Minh', '028 3823 8888', 1),
    ('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'CGV Vincom Center B', '171 Đ. Nguyễn Văn Linh, Quận 7', 'Hồ Chí Minh', '028 3775 2525', 1),
    ('c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 'Lotte Cinema Đống Đa', '38 P. Thái Hà, Đống Đa', 'Hà Nội', '024 3512 1818', 1),
    ('d4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a', 'CineBox Hà Đông', '89 P. Lê Lợi, Hà Đông', 'Hà Nội', '024 3356 8888', 1)
ON CONFLICT (id) DO NOTHING;

-- Update existing cinema rooms to be associated with theaters
UPDATE cinema_room SET theater_id = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d' WHERE id IN (
    SELECT cr.id FROM cinema_room cr
    ORDER BY cr.id
    LIMIT 2
);

UPDATE cinema_room SET theater_id = 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e' WHERE id IN (
    SELECT cr.id FROM cinema_room cr
    ORDER BY cr.id
    LIMIT 2
    OFFSET 2
);

UPDATE cinema_room SET theater_id = 'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f' WHERE id IN (
    SELECT cr.id FROM cinema_room cr
    ORDER BY cr.id
    LIMIT 2
    OFFSET 4
);

UPDATE cinema_room SET theater_id = 'd4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a' WHERE id IN (
    SELECT cr.id FROM cinema_room cr
    ORDER BY cr.id
    LIMIT 2
    OFFSET 6
);
