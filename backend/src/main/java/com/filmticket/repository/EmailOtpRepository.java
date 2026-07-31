package com.filmticket.repository;

import com.filmticket.entity.EmailOtp;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface EmailOtpRepository extends JpaRepository<EmailOtp, UUID> {
    Optional<EmailOtp> findByEmailAndPurpose(String email, EmailOtp.Purpose purpose);
    void deleteByEmailAndPurpose(String email, EmailOtp.Purpose purpose);
}
