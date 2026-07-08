-- V22: Add INDEXES for all tables

-- Bookings indexes
CREATE INDEX IF NOT EXISTS idx_booking_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_showtime ON bookings(showtime_id);
CREATE INDEX IF NOT EXISTS idx_booking_confirmation ON bookings(confirmation_code);
CREATE INDEX IF NOT EXISTS idx_booking_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_booking_hold_expires ON bookings(hold_expires_at);

-- BookingSeats indexes
CREATE INDEX IF NOT EXISTS idx_booking_seat_booking ON booking_seats(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_seat_seat ON booking_seats(seat_id);

-- Tickets indexes
CREATE INDEX IF NOT EXISTS idx_ticket_booking ON tickets(booking_id);
CREATE INDEX IF NOT EXISTS idx_ticket_seat ON tickets(seat_id);
CREATE INDEX IF NOT EXISTS idx_ticket_code ON tickets(ticket_code);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payment_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payment_transaction ON payments(transaction_id);

-- DiscountUsages indexes
CREATE INDEX IF NOT EXISTS idx_discount_usage_discount ON discount_usages(discount_id);
CREATE INDEX IF NOT EXISTS idx_discount_usage_user ON discount_usages(user_id);

-- Showtime indexes
CREATE INDEX IF NOT EXISTS idx_showtime_movie ON showtime(movie_id);
CREATE INDEX IF NOT EXISTS idx_showtime_cinema_room ON showtime(cinema_room_id);
CREATE INDEX IF NOT EXISTS idx_showtime_start_time ON showtime(start_time);
CREATE INDEX IF NOT EXISTS idx_showtime_status ON showtime(status);

-- Seat indexes
CREATE INDEX IF NOT EXISTS idx_seat_cinema_room ON seat(cinema_room_id);
CREATE INDEX IF NOT EXISTS idx_seat_type ON seat(type);

-- CinemaRoom indexes
CREATE INDEX IF NOT EXISTS idx_cinema_room_theater ON cinema_room(theater_id);
CREATE INDEX IF NOT EXISTS idx_cinema_room_status ON cinema_room(status);

-- SeatAvailabilities indexes
CREATE INDEX IF NOT EXISTS idx_seat_avail_showtime ON seat_availabilities(showtime_id);
CREATE INDEX IF NOT EXISTS idx_seat_avail_seat ON seat_availabilities(seat_id);
CREATE INDEX IF NOT EXISTS idx_seat_avail_available ON seat_availabilities(available);

-- ShowtimePriceOverride indexes
CREATE INDEX IF NOT EXISTS idx_showtime_price_showtime ON showtime_price_overrides(showtime_id);

-- RefreshToken indexes
CREATE INDEX IF NOT EXISTS idx_refresh_token_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_token_expiry ON refresh_tokens(expiry_date);
