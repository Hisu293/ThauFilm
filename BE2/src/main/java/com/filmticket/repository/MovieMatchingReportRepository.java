package com.filmticket.repository;
import com.filmticket.entity.MovieMatchingReport;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface MovieMatchingReportRepository extends JpaRepository<MovieMatchingReport, UUID> {}
