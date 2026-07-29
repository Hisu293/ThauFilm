package com.filmticket.service;

import com.filmticket.dto.SeatTypePriceConfigRequest;
import com.filmticket.dto.SeatTypePriceConfigResponse;
import com.filmticket.entity.SeatTypePriceConfig;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.SeatTypePriceConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SeatTypePriceConfigService {

    private final SeatTypePriceConfigRepository seatTypePriceConfigRepository;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public List<SeatTypePriceConfigResponse> getAllActive() {
        return seatTypePriceConfigRepository.findByActiveTrue()
                .stream()
                .map(config -> SeatTypePriceConfigResponse.builder()
                        .id(config.getId())
                        .seatType(config.getSeatType())
                        .price(config.getPrice())
                        .active(config.isActive())
                        .build())
                .toList();
    }

    @Transactional
    public SeatTypePriceConfigResponse upsert(SeatTypePriceConfigRequest request) {
        SeatTypePriceConfig config = seatTypePriceConfigRepository.findBySeatTypeAndActiveTrue(request.getSeatType())
                .orElseGet(SeatTypePriceConfig::new);
        java.math.BigDecimal oldPrice = config.getPrice();
        config.setSeatType(request.getSeatType());
        config.setPrice(request.getPrice());
        config.setActive(true);

        SeatTypePriceConfig saved = seatTypePriceConfigRepository.save(config);
        auditLogService.success(AuditLogService.AuditCommand.builder()
                .action(AuditAction.SEAT_TYPE_PRICE_CHANGED).targetType("SEAT_TYPE_PRICE")
                .targetId(saved.getId().toString()).description("Đã thay đổi giá loại ghế " + saved.getSeatType())
                .oldValues(oldPrice == null ? null : Map.of("giá", oldPrice))
                .newValues(Map.of("loạiGhế", saved.getSeatType(), "giá", saved.getPrice())).build());
        return SeatTypePriceConfigResponse.builder()
                .id(saved.getId())
                .seatType(saved.getSeatType())
                .price(saved.getPrice())
                .active(saved.isActive())
                .build();
    }

    @Transactional
    public SeatTypePriceConfigResponse update(UUID id, SeatTypePriceConfigRequest request) {
        SeatTypePriceConfig config = seatTypePriceConfigRepository.findById(id)
                .orElseThrow(() -> new BadRequestException("Price config not found"));
        java.math.BigDecimal oldPrice = config.getPrice();
        config.setSeatType(request.getSeatType());
        config.setPrice(request.getPrice());
        SeatTypePriceConfig saved = seatTypePriceConfigRepository.save(config);
        auditLogService.success(AuditLogService.AuditCommand.builder()
                .action(AuditAction.SEAT_TYPE_PRICE_CHANGED).targetType("SEAT_TYPE_PRICE")
                .targetId(saved.getId().toString()).description("Đã thay đổi giá loại ghế " + saved.getSeatType())
                .oldValues(Map.of("giá", oldPrice))
                .newValues(Map.of("loạiGhế", saved.getSeatType(), "giá", saved.getPrice())).build());
        return SeatTypePriceConfigResponse.builder()
                .id(saved.getId())
                .seatType(saved.getSeatType())
                .price(saved.getPrice())
                .active(saved.isActive())
                .build();
    }
}
