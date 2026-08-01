package com.filmticket.repository;

import com.filmticket.entity.Theater;
import com.filmticket.model.TheaterStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.UUID;

@Repository
public interface TheaterRepository extends JpaRepository<Theater, UUID> {

    // Hàm cũ của bạn
    List<Theater> findByStatus(TheaterStatus status);

    // --- BỔ SUNG CÁC HÀM TRUY VẤN MỚI CHO BỘ LỌC TỈNH THÀNH ---

    // 1. Tìm tất cả các rạp thuộc một thành phố cụ thể và đang hoạt động (ACTIVE)
    List<Theater> findByCityIgnoreCaseAndStatus(String city, TheaterStatus status);

    // 2. (Tùy chọn) Tìm tất cả các rạp thuộc một thành phố (không quan tâm trạng thái)
    List<Theater> findByCityIgnoreCase(String city);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select theater from Theater theater where theater.id = :id")
    java.util.Optional<Theater> findByIdForUpdate(@Param("id") UUID id);
}
