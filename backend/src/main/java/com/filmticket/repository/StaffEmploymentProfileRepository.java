package com.filmticket.repository;

import com.filmticket.entity.StaffEmploymentProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface StaffEmploymentProfileRepository extends JpaRepository<StaffEmploymentProfile, UUID> {
}
