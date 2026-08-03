package com.filmticket.repository;

import com.filmticket.entity.Payment;
import com.filmticket.entity.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, UUID> {
    List<Payment> findAllByBookingIdOrderByCreatedAtDesc(UUID bookingId);

    default Optional<Payment> findByBookingId(UUID bookingId) {
        return findAllByBookingIdOrderByCreatedAtDesc(bookingId).stream()
                .max(Comparator
                        .comparing((Payment payment) -> payment.getStatus() == PaymentStatus.PAID)
                        .thenComparing(Payment::getPaidAt, Comparator.nullsFirst(LocalDateTime::compareTo))
                        .thenComparing(Payment::getCreatedAt, Comparator.nullsFirst(LocalDateTime::compareTo)));
    }

    Optional<Payment> findByProviderCheckoutId(String providerCheckoutId);
    Optional<Payment> findByProviderPaymentId(String providerPaymentId);
    List<Payment> findAllByBookingIdIn(Set<UUID> bookingIds);
    List<Payment> findAllByDiscountId(UUID discountId);
    long countByDiscountIdAndPaidByUserIdAndStatus(UUID discountId, UUID userId, PaymentStatus status);
}
