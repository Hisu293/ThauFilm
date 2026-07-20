package com.filmticket.util;

import java.text.Normalizer;
import java.util.regex.Pattern;

public class StringUtil {

    public static String normalizeAnswer(String input) {
        if (input == null) return "";

        // 1. Chuyển về chữ thường và xóa khoảng trắng thừa ở 2 đầu
        String temp = input.trim().toLowerCase();

        // 2. Tách các dấu tiếng Việt ra khỏi chữ cái (ví dụ: á -> a + dấu sắc)
        String normalized = Normalizer.normalize(temp, Normalizer.Form.NFD);

        // 3. Dùng Regex xóa tất cả các ký tự dấu tổ hợp vừa tách
        Pattern pattern = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
        String noAccent = pattern.matcher(normalized).replaceAll("");

        // 4. Thay chữ đ/Đ thành d
        noAccent = noAccent.replaceAll("đ", "d");

        // 5. Xóa bỏ toàn bộ các khoảng trắng ở giữa các từ
        return noAccent.replaceAll("\\s+", "");
    }
}