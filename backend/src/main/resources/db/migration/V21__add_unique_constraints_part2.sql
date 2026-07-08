-- V21: Add UNIQUE constraints for seat/booking tables
-- BookingSeat: booking_id + seat_id
ALTER TABLE booking_seats ADD CONSTRAINT uk_booking_seat_booking_seat UNIQUE (booking_id, seat_id);

-- SeatAvailability: showtime_id + seat_id
ALTER TABLE seat_availabilities ADD CONSTRAINT uk_seat_avail_showtime_seat UNIQUE (showtime_id, seat_id);

-- Seat: cinema_room_id + row_name + seat_number
ALTER TABLE seat ADD CONSTRAINT uk_seat_room_row_number UNIQUE (cinema_room_id, row_name, seat_number);

-- DiscountUsage: discount_id + user_id
ALTER TABLE discount_usages ADD CONSTRAINT uk_discount_usage_discount_user UNIQUE (discount_id, user_id);

-- Showtime: cinema_room_id + start_time
ALTER TABLE showtime ADD CONSTRAINT uk_showtime_room_start_time UNIQUE (cinema_room_id, start_time);
