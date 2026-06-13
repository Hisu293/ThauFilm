package com.filmticket.repository;

import com.filmticket.entity.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, UUID> {
    List<Ticket> findByBookingId(UUID bookingId);
    Optional<Ticket> findByTicketCode(String ticketCode);
}
