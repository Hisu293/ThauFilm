package com.filmticket.service;

import com.filmticket.entity.SeatAvailability;
import com.filmticket.entity.SeatTypePriceConfig;
import com.filmticket.entity.ShowtimePriceOverride;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.SeatTypePriceConfigRepository;
import com.filmticket.repository.ShowtimePriceOverrideRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PricingService {

    private final SeatTypePriceConfigRepository seatTypePriceConfigRepository;
    private final ShowtimePriceOverrideRepository showtimePriceOverrideRepository;

    @Transactional
    public void applyDefaultPricing(List<SeatAvailability> availabilities) {
        List<SeatTypePriceConfig> configs = seatTypePriceConfigRepository.findByActiveTrue();
        if (configs.isEmpty()) {
            throw new BadRequestException("Missing seat type price configs");
        }
        Map<String, BigDecimal> configMap = configs.stream()
                .collect(Collectors.toMap(SeatTypePriceConfig::getSeatType, SeatTypePriceConfig::getPrice));

        for (SeatAvailability availability : availabilities) {
            String seatType = availability.getSeat().getType().toStorageValue();
            BigDecimal configPrice = configMap.get(seatType);
            if (configPrice == null) {
                throw new BadRequestException("Missing price config for seat type: " + seatType);
            }
            availability.setPrice(configPrice);
        }
    }
}
