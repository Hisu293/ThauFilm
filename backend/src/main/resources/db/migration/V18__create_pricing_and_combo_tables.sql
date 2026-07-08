CREATE TABLE seat_type_price_configs (
    id UUID PRIMARY KEY,
    seat_type VARCHAR(30) NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE combos (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(500),
    price NUMERIC(10,2) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE showtime_price_overrides (
    id UUID PRIMARY KEY,
    showtime_id UUID NOT NULL,
    seat_type VARCHAR(30) NOT NULL,
    price NUMERIC(10,2) NOT NULL
);

INSERT INTO seat_type_price_configs (id, seat_type, price, active) VALUES
(gen_random_uuid(), 'STANDARD', 90000.00, TRUE),
(gen_random_uuid(), 'VIP', 120000.00, TRUE),
(gen_random_uuid(), 'COUPLE', 220000.00, TRUE)
ON CONFLICT DO NOTHING;
