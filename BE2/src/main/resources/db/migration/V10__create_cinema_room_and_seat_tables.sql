-- 1. Tạo bảng cinema_room (Dùng snake_case để khớp với JPA/Hibernate)
CREATE TABLE cinema_room (
                              id UUID PRIMARY KEY,
                              name VARCHAR(255) NOT NULL,
                              capacity INT,
                              status INT DEFAULT 1
);

-- 2. Tạo bảng seat
CREATE TABLE seat (
                        id UUID PRIMARY KEY,
                        cinema_room_id UUID NOT NULL,
                        row_name VARCHAR(5) NOT NULL,
                        seat_number INT NOT NULL,
                        type VARCHAR(50) DEFAULT 'STANDARD', -- STANDARD, VIP, SWEETBOX...
                        status INT DEFAULT 1,                -- 1: Ghế bình thường, 0: Ghế hỏng không bán
                        CONSTRAINT fk_seat_cinema_room FOREIGN KEY (cinema_room_id) REFERENCES cinema_room(id) ON DELETE CASCADE
);
