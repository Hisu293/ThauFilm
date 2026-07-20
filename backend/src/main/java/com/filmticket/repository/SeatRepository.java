package com.filmticket.repository;

import com.filmticket.entity.Seat;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SeatRepository extends JpaRepository<Seat, UUID> {
    List<Seat> findAllByCinemaRoomIdOrderByRowNameAscSeatNumberAsc(UUID cinemaRoomId);
    List<Seat> findAllByCinemaRoomIdAndStatusOrderByRowNameAscSeatNumberAsc(UUID cinemaRoomId, Seat.Status status);
    long countByCinemaRoomId(UUID cinemaRoomId);
    boolean existsByCinemaRoomIdAndStatus(UUID cinemaRoomId, Seat.Status status);
    @Query("SELECT DISTINCT s.cinemaRoomId FROM Seat s WHERE s.status = :status")
    List<UUID> findDistinctCinemaRoomIdsByStatus(@Param("status") Seat.Status status);
    boolean existsByCinemaRoomIdAndRowNameIgnoreCaseAndSeatNumberAndIdNot(UUID cinemaRoomId, String rowName, Integer seatNumber, UUID id);
    boolean existsByCinemaRoomIdAndRowNameIgnoreCaseAndSeatNumber(UUID cinemaRoomId, String rowName, Integer seatNumber);
}
