ALTER TABLE movie_matches
    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN ended_at TIMESTAMP,
    ADD COLUMN ended_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE movie_match_messages (
    id UUID PRIMARY KEY,
    match_id UUID NOT NULL REFERENCES movie_matches(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content VARCHAR(1000) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_match_message_match_time ON movie_match_messages(match_id, created_at);

CREATE TABLE movie_match_invitations (
    id UUID PRIMARY KEY,
    match_id UUID NOT NULL REFERENCES movie_matches(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    showtime_id UUID NOT NULL REFERENCES showtime(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP,
    CONSTRAINT chk_match_invitation_users CHECK (sender_id <> recipient_id)
);
CREATE INDEX idx_match_invitation_match_time ON movie_match_invitations(match_id, created_at);
CREATE INDEX idx_match_invitation_recipient ON movie_match_invitations(recipient_id, status);

CREATE TABLE movie_matching_blocks (
    id UUID PRIMARY KEY,
    blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_movie_matching_block UNIQUE (blocker_id, blocked_id),
    CONSTRAINT chk_movie_matching_block_not_self CHECK (blocker_id <> blocked_id)
);
CREATE INDEX idx_movie_matching_block_blocker ON movie_matching_blocks(blocker_id);
CREATE INDEX idx_movie_matching_block_blocked ON movie_matching_blocks(blocked_id);

CREATE TABLE movie_matching_reports (
    id UUID PRIMARY KEY,
    match_id UUID REFERENCES movie_matches(id) ON DELETE SET NULL,
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(100) NOT NULL,
    details VARCHAR(1000),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_movie_matching_report_not_self CHECK (reporter_id <> reported_id)
);
CREATE INDEX idx_movie_matching_report_status ON movie_matching_reports(status, created_at);
