package com.filmticket.service;

import com.filmticket.dto.TicketResponse;
import com.filmticket.entity.Booking;
import com.filmticket.entity.BookingStatus;
import com.filmticket.entity.Ticket;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.BookingRepository;
import com.filmticket.repository.PaymentRepository;
import com.filmticket.repository.TicketRepository;
import com.filmticket.util.TicketPdfGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StaffTicketService {

    private final TicketRepository ticketRepository;
    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;
    private final BookingService bookingService;
    private final TicketPdfGenerator ticketPdfGenerator;

    public List<TicketResponse> listTickets() {
        return ticketRepository.findAll().stream()
                .map(TicketResponse::fromTicket)
                .toList();
    }

    public TicketResponse getTicket(UUID ticketId) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new BadRequestException("Ticket not found"));
        return TicketResponse.fromTicket(ticket);
    }

    public Object checkPayment(UUID ticketId) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new BadRequestException("Ticket not found"));
        return paymentRepository.findByBookingId(ticket.getBookingId())
                .orElseThrow(() -> new BadRequestException("Payment not found"));
    }

    @Transactional
    public TicketResponse cancelTicket(UUID ticketId) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new BadRequestException("Ticket not found"));
        Booking booking = bookingRepository.findById(ticket.getBookingId())
                .orElseThrow(() -> new BadRequestException("Booking not found"));
        if (booking.getStatus() == BookingStatus.CANCELLED) {
            throw new BadRequestException("Ticket already cancelled");
        }
        booking.setStatus(BookingStatus.CANCELLED);
        bookingRepository.save(booking);
        return TicketResponse.fromTicket(ticket);
    }

    @Transactional
    public TicketResponse checkIn(String ticketCode) {
        return bookingService.checkIn(ticketCode);
    }

    public ResponseEntity<ByteArrayResource> reprintTicket(UUID ticketId) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new BadRequestException("Ticket not found"));
        Booking booking = bookingRepository.findById(ticket.getBookingId())
                .orElseThrow(() -> new BadRequestException("Booking not found"));
        List<Ticket> tickets = ticketRepository.findByBookingId(booking.getId());
        try {
            byte[] pdf = ticketPdfGenerator.generateTicketPdf(booking, tickets);
            ByteArrayResource resource = new ByteArrayResource(pdf);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=ticket-" + ticket.getTicketCode() + ".pdf")
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(resource);
        } catch (Exception ex) {
            throw new BadRequestException("Failed to reprint ticket: " + ex.getMessage());
        }
    }
}
