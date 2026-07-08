package com.filmticket.repository;
import com.filmticket.entity.MovieMatchMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;
public interface MovieMatchMessageRepository extends JpaRepository<MovieMatchMessage, UUID> {
    List<MovieMatchMessage> findByMatchIdOrderByCreatedAtAsc(UUID matchId);
}
