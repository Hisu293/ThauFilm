DELETE FROM movie_match_invitations pending
WHERE pending.status = 'PENDING'
  AND EXISTS (
      SELECT 1
      FROM movie_match_invitations accepted
      WHERE accepted.match_id = pending.match_id
        AND accepted.showtime_id = pending.showtime_id
        AND accepted.status = 'ACCEPTED'
  );

WITH ranked_pending AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY match_id, showtime_id
               ORDER BY created_at DESC, id DESC
           ) AS duplicate_rank
    FROM movie_match_invitations
    WHERE status = 'PENDING'
)
DELETE FROM movie_match_invitations invitation
USING ranked_pending
WHERE invitation.id = ranked_pending.id
  AND ranked_pending.duplicate_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uk_match_invitation_pending_showtime
    ON movie_match_invitations(match_id, showtime_id)
    WHERE status = 'PENDING';
