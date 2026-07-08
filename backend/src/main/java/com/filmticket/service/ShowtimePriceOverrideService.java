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
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ShowtimePriceOverrideService {

    private final ShowtimeRepository showtimeRepository;
    private final ShowtimePriceOverrideRepository showtimePriceOverrideRepository;

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
        override.setPrice(request.getPrice());
        ShowtimePriceOverride saved = showtimePriceOverrideRepository.save(override);
        return ShowtimePriceOverrideResponse.builder()
                .id(saved.getId())
                .showtimeId(saved.getShowtimeId())
                .seatType(saved.getSeatType())
                .price(saved.getPrice())
                .build();
    }
}
