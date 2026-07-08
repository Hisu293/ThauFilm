package com.filmticket.service;

import java.math.BigDecimal;
import java.util.UUID;

public record BookingConfirmedEvent(UUID bookingId, BigDecimal discountAmount, BigDecimal finalAmount) {
}
