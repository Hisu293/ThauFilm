package com.filmticket.service;

import com.filmticket.dto.SeatTypePriceConfigRequest;
import com.filmticket.dto.SeatTypePriceConfigResponse;
import com.filmticket.dto.ShowtimePriceOverrideRequest;
import com.filmticket.dto.ShowtimePriceOverrideResponse;
import com.filmticket.entity.SeatTypePriceConfig;
import com.filmticket.entity.Showtime;
import com.filmticket.entity.ShowtimePriceOverride;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.SeatTypePriceConfigRepository;
import com.filmticket.repository.ShowtimePriceOverrideRepository;
import com.filmticket.repository.ShowtimeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AdminPricingService {

    private final SeatTypePriceConfigRepository seatTypePriceConfigRepository;
    private final ShowtimePriceOverrideRepository showtimePriceOverrideRepository;
    private final ShowtimeRepository showtimeRepository;

    @Transactional(readOnly = true)
    public List<SeatTypePriceConfigResponse> getSeatTypePriceConfigs() {
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
    public SeatTypePriceConfigResponse upsertSeatTypePriceConfig(SeatTypePriceConfigRequest request) {
        SeatTypePriceConfig config = seatTypePriceConfigRepository.findBySeatTypeAndActiveTrue(request.getSeatType())
                .orElseGet(SeatTypePriceConfig::new);
        config.setSeatType(request.getSeatType());
        config.setPrice(request.getPrice());
        config.setActive(true);
        SeatTypePriceConfig saved = seatTypePriceConfigRepository.save(config);
        return toResponse(saved);
    }

    @Transactional
    public List<ShowtimePriceOverrideResponse> getShowtimePriceOverrides(UUID showtimeId) {
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
    public ShowtimePriceOverrideResponse setShowtimePriceOverride(ShowtimePriceOverrideRequest request) {
        Showtime showtime = showtimeRepository.findById(request.getShowtimeId())
                .orElseThrow(() -> new BadRequestException("Showtime not found"));
        ShowtimePriceOverride override = showtimePriceOverrideRepository
                .findByShowtimeIdAndSeatType(request.getShowtimeId(), request.getSeatType())
                .orElseGet(() -> ShowtimePriceOverride.builder()
                        .showtime(showtime)
                        .seatType(request.getSeatType())
                        .build());
        override.setPrice(request.getPrice());
        ShowtimePriceOverride saved = showtimePriceOverrideRepository.save(override);
        return ShowtimePriceOverrideResponse.builder()
                .id(saved.getId())
                .showtimeId(saved.getShowtime().getId())
                .seatType(saved.getSeatType())
                .price(saved.getPrice())
                .build();
    }

    private SeatTypePriceConfigResponse toResponse(SeatTypePriceConfig config) {
        return SeatTypePriceConfigResponse.builder()
                .id(config.getId())
                .seatType(config.getSeatType())
                .price(config.getPrice())
                .active(config.isActive())
                .build();
    }
}
