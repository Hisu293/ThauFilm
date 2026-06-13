package com.filmticket.model;

public enum SeatType {
    VIP("VIP"),
    THUONG("THƯỜNG"),
    STANDARD("STANDARD"),
    COUPLE("COUPLE");

    private final String value;

    SeatType(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static SeatType fromValue(String value) {
        if (value == null) return null;
        for (SeatType type : values()) {
            if (type.name().equalsIgnoreCase(value) || type.value.equalsIgnoreCase(value)) {
                return type;
            }
        }
        return null;
    }

    public String toStorageValue() {
        return switch (this) {
            case VIP -> "VIP";
            case THUONG, STANDARD -> "STANDARD";
            case COUPLE -> "COUPLE";
        };
    }
}
