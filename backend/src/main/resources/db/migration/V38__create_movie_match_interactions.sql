ALTER TABLE movie_matches
    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN ended_at TIMESTAMP,
    ADD COLUMN ended_by UUID;
CREATE INDEX idx_movie_match_ended_by ON movie_matches(ended_by);

CREATE TABLE movie_match_messages (
    id UUID PRIMARY KEY,
    match_id UUID NOT NULL,
    sender_id UUID NOT NULL,
    content VARCHAR(1000) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_match_message_match_time ON movie_match_messages(match_id, created_at);
CREATE INDEX idx_match_message_sender ON movie_match_messages(sender_id);

CREATE TABLE movie_match_invitations (
    id UUID PRIMARY KEY,
    match_id UUID NOT NULL,
    sender_id UUID NOT NULL,
    recipient_id UUID NOT NULL,
    showtime_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP,
    CONSTRAINT chk_match_invitation_users CHECK (sender_id <> recipient_id)
);
CREATE INDEX idx_match_invitation_match_time ON movie_match_invitations(match_id, created_at);
CREATE INDEX idx_match_invitation_recipient ON movie_match_invitations(recipient_id, status);
CREATE INDEX idx_match_invitation_sender ON movie_match_invitations(sender_id);
CREATE INDEX idx_match_invitation_showtime ON movie_match_invitations(showtime_id);

CREATE TABLE movie_matching_blocks (
    id UUID PRIMARY KEY,
    blocker_id UUID NOT NULL,
    blocked_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_movie_matching_block UNIQUE (blocker_id, blocked_id),
    CONSTRAINT chk_movie_matching_block_not_self CHECK (blocker_id <> blocked_id)
);
CREATE INDEX idx_movie_matching_block_blocker ON movie_matching_blocks(blocker_id);
CREATE INDEX idx_movie_matching_block_blocked ON movie_matching_blocks(blocked_id);

CREATE TABLE movie_matching_reports (
    id UUID PRIMARY KEY,
    match_id UUID,
    reporter_id UUID NOT NULL,
    reported_id UUID NOT NULL,
    reason VARCHAR(100) NOT NULL,
    details VARCHAR(1000),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_movie_matching_report_not_self CHECK (reporter_id <> reported_id)
);
CREATE INDEX idx_movie_matching_report_status ON movie_matching_reports(status, created_at);
CREATE INDEX idx_movie_matching_report_match ON movie_matching_reports(match_id);
CREATE INDEX idx_movie_matching_report_reporter ON movie_matching_reports(reporter_id);
CREATE INDEX idx_movie_matching_report_reported ON movie_matching_reports(reported_id);
