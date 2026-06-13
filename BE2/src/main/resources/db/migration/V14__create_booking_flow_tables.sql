CREATE TABLE bookings (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    showtime_id UUID NOT NULL REFERENCES showtime(id),
    total_amount NUMERIC(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    confirmation_code VARCHAR(20) UNIQUE,
    hold_expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL,
    confirmed_at TIMESTAMP
);

CREATE TABLE booking_seats (
    id UUID PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    seat_id UUID NOT NULL REFERENCES seat(id),
    price_at_booking NUMERIC(10,2) NOT NULL,
    CONSTRAINT uq_booking_seat UNIQUE (booking_id, seat_id)
);

CREATE TABLE payments (
    id UUID PRIMARY KEY,
    booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    payment_method VARCHAR(50),
    status VARCHAR(20) NOT NULL,
    transaction_id VARCHAR(100) UNIQUE,
    created_at TIMESTAMP NOT NULL,
    paid_at TIMESTAMP
);

CREATE TABLE tickets (
    id UUID PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    seat_id UUID NOT NULL REFERENCES seat(id),
    ticket_code VARCHAR(20) NOT NULL UNIQUE,
    checked_in BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE seat_availabilities (
    id UUID PRIMARY KEY,
    showtime_id UUID NOT NULL REFERENCES showtime(id) ON DELETE CASCADE,
    seat_id UUID NOT NULL REFERENCES seat(id) ON DELETE CASCADE,
    available BOOLEAN NOT NULL DEFAULT TRUE,
    price NUMERIC(10,2) NOT NULL,
    CONSTRAINT uq_showtime_seat UNIQUE (showtime_id, seat_id)
);

INSERT INTO seat_availabilities (id, showtime_id, seat_id, available, price)
SELECT gen_random_uuid(), st.id, s.id, TRUE, 90000.00
FROM showtime st
JOIN seat s ON s.cinema_room_id = st.cinema_room_id
LEFT JOIN seat_availabilities sa ON sa.showtime_id = st.id AND sa.seat_id = s.id
WHERE sa.id IS NULL;
