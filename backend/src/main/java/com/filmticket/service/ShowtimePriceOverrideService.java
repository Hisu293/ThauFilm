package com.filmticket.service;

import com.filmticket.dto.ShowtimePriceOverrideRequest;
import com.filmticket.dto.ShowtimePriceOverrideResponse;
import com.filmticket.entity.ShowtimePriceOverride;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.ShowtimePriceOverrideRepository;
import com.filmticket.repository.ShowtimeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ShowtimePriceOverrideService {

    private final ShowtimeRepository showtimeRepository;
    private final ShowtimePriceOverrideRepository showtimePriceOverrideRepository;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public List<ShowtimePriceOverrideResponse> getOverrides(UUID showtimeId) {
        return showtimePriceOverrideRepository.findByShowtimeId(showtimeId)
                .stream()
                .map(override -> ShowtimePriceOverrideResponse.builder()
                        .id(override.getId())
                        .showtimeId(showtimeId)
                        .seatType(override.getSeatType())
                        .price(override.getPrice())
                        .build())
                .toList();
    }

    @Transactional
    public ShowtimePriceOverrideResponse setOverride(ShowtimePriceOverrideRequest request) {
        if (!showtimeRepository.existsById(request.getShowtimeId())) {
            throw new BadRequestException("Showtime not found");
        }

        ShowtimePriceOverride override = showtimePriceOverrideRepository
                .findByShowtimeIdAndSeatType(request.getShowtimeId(), request.getSeatType())
                .orElseGet(() -> ShowtimePriceOverride.builder()
                        .showtimeId(request.getShowtimeId())
                        .seatType(request.getSeatType())
                        .build());
        java.math.BigDecimal oldPrice = override.getPrice();
        override.setPrice(request.getPrice());
        ShowtimePriceOverride saved = showtimePriceOverrideRepository.save(override);
        auditLogService.success(AuditLogService.AuditCommand.builder()
                .action(AuditAction.SHOWTIME_PRICE_OVERRIDE_UPDATED).targetType("SHOWTIME_PRICE")
                .targetId(saved.getId().toString()).description("Đã thay đổi giá riêng của suất chiếu")
                .oldValues(oldPrice == null ? null : Map.of("giá", oldPrice))
                .newValues(Map.of("mãSuấtChiếu", saved.getShowtimeId(), "loạiGhế", saved.getSeatType(),
                        "giá", saved.getPrice()))
                .correlationId(saved.getShowtimeId().toString()).build());
        return ShowtimePriceOverrideResponse.builder()
                .id(saved.getId())
                .showtimeId(saved.getShowtimeId())
                .seatType(saved.getSeatType())
                .price(saved.getPrice())
                .build();
    }
}
