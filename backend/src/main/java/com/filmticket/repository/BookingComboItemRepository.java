package com.filmticket.repository;
import com.filmticket.entity.BookingComboItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;
public interface BookingComboItemRepository extends JpaRepository<BookingComboItem, UUID> {
    List<BookingComboItem> findByBookingId(UUID bookingId);
    void deleteByBookingId(UUID bookingId);
}
