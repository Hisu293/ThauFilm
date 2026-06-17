-- V23: Drop legacy foreign key constraints (if any exist)
-- This migration removes FK constraints to use UUID reference + Index pattern

-- Check and drop FK in booking_seats if exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_booking_seats_booking' 
        AND table_name = 'booking_seats'
    ) THEN
        ALTER TABLE booking_seats DROP CONSTRAINT fk_booking_seats_booking;
    END IF;
END
$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_booking_seats_seat' 
        AND table_name = 'booking_seats'
    ) THEN
        ALTER TABLE booking_seats DROP CONSTRAINT fk_booking_seats_seat;
    END IF;
END
$$;

-- Check and drop FK in tickets if exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_tickets_booking' 
        AND table_name = 'tickets'
    ) THEN
        ALTER TABLE tickets DROP CONSTRAINT fk_tickets_booking;
    END IF;
END
$$;

-- Check and drop FK in payments if exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_payments_booking' 
        AND table_name = 'payments'
    ) THEN
        ALTER TABLE payments DROP CONSTRAINT fk_payments_booking;
    END IF;
END
$$;

-- Check and drop FK in seat_availabilities if exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_seat_avail_showtime' 
        AND table_name = 'seat_availabilities'
    ) THEN
        ALTER TABLE seat_availabilities DROP CONSTRAINT fk_seat_avail_showtime;
    END IF;
END
$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_seat_avail_seat' 
        AND table_name = 'seat_availabilities'
    ) THEN
        ALTER TABLE seat_availabilities DROP CONSTRAINT fk_seat_avail_seat;
    END IF;
END
$$;

-- Check and drop FK in showtime if exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_showtime_movie' 
        AND table_name = 'showtime'
    ) THEN
        ALTER TABLE showtime DROP CONSTRAINT fk_showtime_movie;
    END IF;
END
$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_showtime_cinema_room' 
        AND table_name = 'showtime'
    ) THEN
        ALTER TABLE showtime DROP CONSTRAINT fk_showtime_cinema_room;
    END IF;
END
$$;

-- Check and drop FK in seat if exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_seat_cinema_room' 
        AND table_name = 'seat'
    ) THEN
        ALTER TABLE seat DROP CONSTRAINT fk_seat_cinema_room;
    END IF;
END
$$;

-- Check and drop FK in cinema_room if exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_cinema_room_theater' 
        AND table_name = 'cinema_room'
    ) THEN
        ALTER TABLE cinema_room DROP CONSTRAINT fk_cinema_room_theater;
    END IF;
END
$$;
