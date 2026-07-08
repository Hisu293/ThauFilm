package com.filmticket.model;

public enum RoomStatus {
    ACTIVE("ACTIVE"),
    INACTIVE("INACTIVE"),
    MAINTENANCE("MAINTENANCE");

    private final String value;

    RoomStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static RoomStatus fromValue(String value) {
        if (value == null) {
            return ACTIVE;
        }
        for (RoomStatus status : values()) {
            if (status.value.equalsIgnoreCase(value)) {
                return status;
            }
        }
        return ACTIVE;
    }
}
