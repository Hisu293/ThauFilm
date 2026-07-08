package com.filmticket.model;

public enum TheaterStatus {
    ACTIVE("ACTIVE"),
    INACTIVE("INACTIVE"),
    MAINTENANCE("MAINTENANCE");

    private final String value;

    TheaterStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static TheaterStatus fromValue(String value) {
        if (value == null) {
            return ACTIVE;
        }
        for (TheaterStatus status : values()) {
            if (status.value.equalsIgnoreCase(value)) {
                return status;
            }
        }
        return ACTIVE;
    }
}
