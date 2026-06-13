package com.filmticket.model;

public enum SeatStatus {
    ACTIVE(1),
    INACTIVE(0);

    private final Integer value;

    SeatStatus(Integer value) {
        this.value = value;
    }

    public Integer getValue() {
        return value;
    }

    public static SeatStatus fromValue(Integer value) {
        if (value == null) return ACTIVE;
        for (SeatStatus status : values()) {
            if (status.value.equals(value)) {
                return status;
            }
        }
        return ACTIVE;
    }
}
