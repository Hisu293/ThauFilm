package com.filmticket.repository;

import com.filmticket.entity.Discount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface DiscountRepository extends JpaRepository<Discount, UUID> {
    Optional<Discount> findByCodeAndActiveTrue(String code);
    Optional<Discount> findByCode(String code);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select d from Discount d where d.id = :id")
    Optional<Discount> findByIdForUpdate(@Param("id") UUID id);
}
