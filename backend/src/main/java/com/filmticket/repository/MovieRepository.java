package com.filmticket.repository;

import com.filmticket.entity.Movie;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MovieRepository extends JpaRepository<Movie, UUID> {
    boolean existsByTitleIgnoreCase(String title);
    boolean existsByTitleIgnoreCaseAndIdNot(String title, UUID id);
    List<Movie> findAllByActiveTrue();
    List<Movie> findAllByActiveTrueAndStatus(Movie.Status status);
}
