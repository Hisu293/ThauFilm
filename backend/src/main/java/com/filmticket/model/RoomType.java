package com.filmticket.model;

public enum RoomType {
    STANDARD("STANDARD"),
    VIP("VIP"),
    IMAX("IMAX"),
    FOUR_DX("4DX");

    private final String value;

    RoomType(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static RoomType fromValue(String value) {
        if (value == null) {
            return null;
        }
        for (RoomType type : values()) {
            if (type.name().equalsIgnoreCase(value) || type.value.equalsIgnoreCase(value)) {
                return type;
            }
        }
        return null;
    }
}
