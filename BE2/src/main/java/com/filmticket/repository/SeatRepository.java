package com.filmticket.repository;

import com.filmticket.entity.Seat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SeatRepository extends JpaRepository<Seat, UUID> {
    List<Seat> findAllByCinemaRoomIdOrderByRowNameAscSeatNumberAsc(UUID cinemaRoomId);
    boolean existsByCinemaRoomIdAndRowNameIgnoreCaseAndSeatNumberAndIdNot(UUID cinemaRoomId, String rowName, Integer seatNumber, UUID id);
    boolean existsByCinemaRoomIdAndRowNameIgnoreCaseAndSeatNumber(UUID cinemaRoomId, String rowName, Integer seatNumber);
}
