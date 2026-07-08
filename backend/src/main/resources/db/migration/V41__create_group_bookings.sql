CREATE TABLE IF NOT EXISTS group_bookings (
    id UUID PRIMARY KEY,
    invitation_id UUID NOT NULL,
    showtime_id UUID NOT NULL,
    selector_id UUID,
    status VARCHAR(30) NOT NULL,
    expires_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_group_booking_invitation ON group_bookings(invitation_id);
CREATE INDEX IF NOT EXISTS idx_group_booking_showtime ON group_bookings(showtime_id);
CREATE INDEX IF NOT EXISTS idx_group_booking_selector ON group_bookings(selector_id);
CREATE INDEX IF NOT EXISTS idx_group_booking_status_expiry ON group_bookings(status, expires_at);

CREATE TABLE IF NOT EXISTS group_booking_members (
    id UUID PRIMARY KEY,
    group_booking_id UUID NOT NULL,
    user_id UUID NOT NULL,
    seat_id UUID,
    booking_id UUID,
    amount NUMERIC(10,2),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    paid_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_group_booking_member ON group_booking_members(group_booking_id, user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_group_booking_seat ON group_booking_members(group_booking_id, seat_id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_group_booking_member_booking ON group_booking_members(booking_id);
CREATE INDEX IF NOT EXISTS idx_group_member_group ON group_booking_members(group_booking_id);
CREATE INDEX IF NOT EXISTS idx_group_member_user ON group_booking_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_member_seat ON group_booking_members(seat_id);
CREATE INDEX IF NOT EXISTS idx_group_member_booking ON group_booking_members(booking_id);

-- UUID columns intentionally have indexes/unique constraints only. No foreign keys.

-- Preserve invitations that were accepted before this feature was deployed.
INSERT INTO group_bookings (id, invitation_id, showtime_id, status, created_at)
SELECT gen_random_uuid(), invitation.id, invitation.showtime_id, 'WAITING_SELECTION', CURRENT_TIMESTAMP
FROM movie_match_invitations invitation
WHERE invitation.status = 'ACCEPTED'
ON CONFLICT (invitation_id) DO NOTHING;

INSERT INTO group_booking_members (id, group_booking_id, user_id, payment_status, created_at)
SELECT gen_random_uuid(), group_booking.id, participant.user_id, 'PENDING', CURRENT_TIMESTAMP
FROM group_bookings group_booking
JOIN movie_match_invitations invitation ON invitation.id = group_booking.invitation_id
CROSS JOIN LATERAL (VALUES (invitation.sender_id), (invitation.recipient_id)) participant(user_id)
ON CONFLICT (group_booking_id, user_id) DO NOTHING;
