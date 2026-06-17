-- V20: Add UNIQUE constraints for booking-related tables
-- Booking confirmation_code (already has, but ensure)
ALTER TABLE bookings ADD CONSTRAINT uk_booking_confirmation UNIQUE (confirmation_code);

-- Ticket ticket_code
ALTER TABLE tickets ADD CONSTRAINT uk_ticket_code UNIQUE (ticket_code);

-- Payment transaction_id
ALTER TABLE payments ADD CONSTRAINT uk_payment_transaction UNIQUE (transaction_id);

-- Discount code
ALTER TABLE discounts ADD CONSTRAINT uk_discount_code UNIQUE (code);

-- User email
ALTER TABLE users ADD CONSTRAINT uk_user_email UNIQUE (email);

-- Movie title
ALTER TABLE movies ADD CONSTRAINT uk_movie_title UNIQUE (title);

-- RefreshToken token
ALTER TABLE refresh_tokens ADD CONSTRAINT uk_refresh_token UNIQUE (token);

-- ShowtimePriceOverride: showtime_id + seat_type
ALTER TABLE showtime_price_overrides ADD CONSTRAINT uk_showtime_price_showtime_seat_type UNIQUE (showtime_id, seat_type);
