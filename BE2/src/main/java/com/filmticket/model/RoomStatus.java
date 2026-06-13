package com.filmticket.model;

public enum RoomStatus {
    ACTIVE(1),
    INACTIVE(0),
    MAINTENANCE(2);

    private final Integer value;

    RoomStatus(Integer value) {
        this.value = value;
    }

    public Integer getValue() {
        return value;
    }

    public static RoomStatus fromValue(Integer value) {
        if (value == null) return ACTIVE;
        for (RoomStatus status : values()) {
            if (status.value.equals(value)) {
                return status;
            }
        }
        return ACTIVE;
    }
}
