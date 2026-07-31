package com.filmticket.repository;
import com.filmticket.entity.MovieMatchInvitation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
public interface MovieMatchInvitationRepository extends JpaRepository<MovieMatchInvitation, UUID> {
    List<MovieMatchInvitation> findByMatchIdOrderByCreatedAtDesc(UUID matchId);
    List<MovieMatchInvitation> findByMatchId(UUID matchId);
    List<MovieMatchInvitation> findByMatchIdAndShowtimeIdAndStatusInOrderByCreatedAtDesc(
            UUID matchId, UUID showtimeId, List<MovieMatchInvitation.Status> statuses);
}
