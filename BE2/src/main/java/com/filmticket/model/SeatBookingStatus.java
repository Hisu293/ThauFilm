package com.filmticket.model;

public enum SeatBookingStatus {
    AVAILABLE("AVAILABLE"),
    HOLDING("HOLDING"),
    BOOKED("BOOKED"),
    SOLD("SOLD");

    private final String value;

    SeatBookingStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static SeatBookingStatus fromValue(String value) {
        if (value == null) {
            return null;
        }
        for (SeatBookingStatus status : values()) {
            if (status.name().equalsIgnoreCase(value) || status.value.equalsIgnoreCase(value)) {
                return status;
            }
        }
        return null;
    }
}
