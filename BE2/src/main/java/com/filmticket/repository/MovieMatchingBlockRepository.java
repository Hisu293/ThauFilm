package com.filmticket.repository;
import com.filmticket.entity.MovieMatchingBlock;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;
public interface MovieMatchingBlockRepository extends JpaRepository<MovieMatchingBlock, UUID> {
    boolean existsByBlockerIdAndBlockedId(UUID blockerId, UUID blockedId);
    List<MovieMatchingBlock> findByBlockerIdOrBlockedId(UUID blockerId, UUID blockedId);
}
