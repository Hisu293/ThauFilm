package com.filmticket.repository;

import com.filmticket.entity.CinemaRoom;
import com.filmticket.model.RoomStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CinemaRoomRepository extends JpaRepository<CinemaRoom, UUID> {
    List<CinemaRoom> findByStatus(RoomStatus status);
    List<CinemaRoom> findByTheaterId(UUID theaterId);
}
