package com.filmticket.service;

import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

@Service
public class StaffReportService {

    public Map<String, Object> revenue(LocalDate from, LocalDate to) {
        Map<String, Object> report = new HashMap<>();
        report.put("from", from);
        report.put("to", to);
        report.put("totalRevenue", 0);
        return report;
    }

    public Map<String, Object> ticketSales(LocalDate from, LocalDate to) {
        Map<String, Object> report = new HashMap<>();
        report.put("from", from);
        report.put("to", to);
        report.put("ticketsSold", 0);
        report.put("totalAmount", 0);
        return report;
    }

    public Map<String, Object> onlineMovieSales(LocalDate from, LocalDate to) {
        Map<String, Object> report = new HashMap<>();
        report.put("from", from);
        report.put("to", to);
        report.put("onlineSales", 0);
        report.put("viewCount", 0);
        return report;
    }

    public Map<String, Object> topMovies(int limit) {
        Map<String, Object> report = new HashMap<>();
        report.put("limit", limit);
        report.put("topMovies", java.util.Collections.emptyList());
        return report;
    }

    public Map<String, Object> topShowtimes(int limit) {
        Map<String, Object> report = new HashMap<>();
        report.put("limit", limit);
        report.put("topShowtimes", java.util.Collections.emptyList());
        return report;
    }
}
