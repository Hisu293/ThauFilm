package com.filmticket.service;

import com.filmticket.entity.Seat;
import com.filmticket.entity.SeatAvailability;
import com.filmticket.entity.SeatTypePriceConfig;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.SeatRepository;
import com.filmticket.repository.SeatTypePriceConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PricingService {

    private final SeatTypePriceConfigRepository seatTypePriceConfigRepository;
    private final SeatRepository seatRepository;

    @Transactional
    public void applyDefaultPricing(List<SeatAvailability> availabilities) {
        List<SeatTypePriceConfig> configs = seatTypePriceConfigRepository.findByActiveTrue();
        if (configs.isEmpty()) {
            throw new BadRequestException("Missing seat type price configs");
        }
        Map<String, BigDecimal> configMap = configs.stream()
                .collect(Collectors.toMap(SeatTypePriceConfig::getSeatType, SeatTypePriceConfig::getPrice));

        for (SeatAvailability availability : availabilities) {
            Seat seat = seatRepository.findById(availability.getSeatId()).orElse(null);
            if (seat == null) {
                throw new BadRequestException("Seat not found: " + availability.getSeatId());
            }
            String seatType = seat.getType().toStorageValue();
            BigDecimal configPrice = configMap.get(seatType);
            if (configPrice == null) {
                throw new BadRequestException("Missing price config for seat type: " + seatType);
            }
            availability.setPrice(configPrice);
        }
    }

    public BigDecimal getPriceForSeatType(UUID showtimeId, String seatType) {
        List<SeatTypePriceConfig> configs = seatTypePriceConfigRepository.findByActiveTrue();
        return configs.stream()
                .filter(c -> c.getSeatType().equals(seatType))
                .findFirst()
                .map(SeatTypePriceConfig::getPrice)
                .orElse(BigDecimal.ZERO);
    }
}
