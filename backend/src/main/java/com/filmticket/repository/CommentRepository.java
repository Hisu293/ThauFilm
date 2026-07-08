package com.filmticket.repository;

import com.filmticket.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CommentRepository extends JpaRepository<Comment, UUID> {

    List<Comment> findByMovieIdAndParentIdIsNullOrderByCreatedAtDesc(UUID movieId);

    List<Comment> findByParentIdOrderByCreatedAtAsc(UUID parentId);

    long countByMovieId(UUID movieId);
}
