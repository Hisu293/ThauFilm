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
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SeatTypePriceConfigService {

    private final SeatTypePriceConfigRepository seatTypePriceConfigRepository;

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
        config.setSeatType(request.getSeatType());
        config.setPrice(request.getPrice());
        config.setActive(true);

        SeatTypePriceConfig saved = seatTypePriceConfigRepository.save(config);
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
        config.setSeatType(request.getSeatType());
        config.setPrice(request.getPrice());
        SeatTypePriceConfig saved = seatTypePriceConfigRepository.save(config);
        return SeatTypePriceConfigResponse.builder()
                .id(saved.getId())
                .seatType(saved.getSeatType())
                .price(saved.getPrice())
                .active(saved.isActive())
                .build();
    }
}
