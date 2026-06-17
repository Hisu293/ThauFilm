package com.filmticket.model;

public enum ShowtimeStatus {
    SCHEDULED("SCHEDULED"),
    OPEN("OPEN"),
    RUNNING("RUNNING"),
    COMPLETED("COMPLETED"),
    CANCELLED("CANCELLED");

    private final String value;

    ShowtimeStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static ShowtimeStatus fromValue(String value) {
        if (value == null) {
            return SCHEDULED;
        }
        for (ShowtimeStatus status : values()) {
            if (status.value.equalsIgnoreCase(value)) {
                return status;
            }
        }
        return SCHEDULED;
    }
}
