package com.filmticket.repository;

import com.filmticket.entity.Combo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ComboRepository extends JpaRepository<Combo, UUID> {
    List<Combo> findByActiveTrue();
}
