package com.filmticket.service;

import com.filmticket.entity.*;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InventoryForecastService {
    private static final ZoneId VIETNAM = ZoneId.of("Asia/Ho_Chi_Minh");
    private final InventoryItemRepository itemRepository;
    private final ComboInventoryRecipeRepository recipeRepository;
    private final BookingComboItemRepository bookingComboRepository;
    private final BookingRepository bookingRepository;
    private final ComboRepository comboRepository;

    @Transactional(readOnly = true)
    public Map<String, Object> dashboard() {
        LocalDateTime now = LocalDateTime.now(VIETNAM);
        LocalDateTime start = now.toLocalDate().atStartOfDay();
        Set<UUID> confirmedIds = bookingRepository.findByStatusAndConfirmedAtBetween(BookingStatus.CONFIRMED, start, now)
                .stream().map(Booking::getId).collect(Collectors.toSet());
        Map<UUID, Integer> comboSales = bookingComboRepository.findAll().stream()
                .filter(item -> confirmedIds.contains(item.getBookingId()))
                .collect(Collectors.groupingBy(BookingComboItem::getComboId, Collectors.summingInt(BookingComboItem::getQuantity)));
        List<ComboInventoryRecipe> recipes = recipeRepository.findAll();
        double elapsedHours = Math.max(0.25, Duration.between(start, now).toMinutes() / 60d);
        List<Map<String, Object>> forecasts = itemRepository.findByActiveTrueOrderByNameAsc().stream()
                .map(item -> forecast(item, recipes, comboSales, elapsedHours)).toList();
        long warnings = forecasts.stream().filter(row -> !"HEALTHY".equals(row.get("risk"))).count();
        return row("generatedAt", now, "elapsedHours", round(elapsedHours), "warningCount", warnings,
                "forecasts", forecasts, "comboSalesToday", comboSales);
    }

    @Transactional
    public Map<String, Object> saveItem(UUID id, String name, String unit, BigDecimal currentStock, BigDecimal reorderLevel, Boolean active) {
        if (name == null || name.isBlank() || unit == null || unit.isBlank()) throw new BadRequestException("Tên và đơn vị tồn kho là bắt buộc");
        InventoryItem item = id == null ? new InventoryItem() : itemRepository.findById(id)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy mặt hàng"));
        item.setName(name.trim()); item.setUnit(unit.trim()); item.setCurrentStock(nonNegative(currentStock));
        item.setReorderLevel(nonNegative(reorderLevel)); item.setActive(active == null || active);
        return itemRow(itemRepository.save(item));
    }

    @Transactional
    public Map<String, Object> saveRecipe(UUID comboId, UUID itemId, BigDecimal quantity) {
        if (!comboRepository.existsById(comboId)) throw new BadRequestException("Không tìm thấy combo");
        if (!itemRepository.existsById(itemId)) throw new BadRequestException("Không tìm thấy mặt hàng tồn kho");
        if (quantity == null || quantity.signum() <= 0) throw new BadRequestException("Định lượng phải lớn hơn 0");
        ComboInventoryRecipe recipe = recipeRepository.findByComboIdAndInventoryItemId(comboId, itemId)
                .orElseGet(() -> ComboInventoryRecipe.builder().comboId(comboId).inventoryItemId(itemId).build());
        recipe.setQuantityPerCombo(quantity);
        recipe = recipeRepository.save(recipe);
        return row("id", recipe.getId(), "comboId", comboId, "inventoryItemId", itemId, "quantityPerCombo", quantity);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> configuration() {
        Map<UUID, String> comboNames = comboRepository.findAll().stream().collect(Collectors.toMap(Combo::getId, Combo::getName));
        Map<UUID, String> itemNames = itemRepository.findAll().stream().collect(Collectors.toMap(InventoryItem::getId, InventoryItem::getName));
        return recipeRepository.findAll().stream().map(recipe -> row("id", recipe.getId(), "comboId", recipe.getComboId(),
                "comboName", comboNames.getOrDefault(recipe.getComboId(), "Combo đã xóa"), "inventoryItemId", recipe.getInventoryItemId(),
                "inventoryItemName", itemNames.getOrDefault(recipe.getInventoryItemId(), "Mặt hàng đã xóa"),
                "quantityPerCombo", recipe.getQuantityPerCombo())).toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> combos() {
        return comboRepository.findByActiveTrue().stream().map(combo -> row("id", combo.getId(), "name", combo.getName())).toList();
    }

    private Map<String, Object> forecast(InventoryItem item, List<ComboInventoryRecipe> recipes,
                                         Map<UUID, Integer> comboSales, double elapsedHours) {
        BigDecimal consumed = recipes.stream().filter(recipe -> recipe.getInventoryItemId().equals(item.getId()))
                .map(recipe -> recipe.getQuantityPerCombo().multiply(BigDecimal.valueOf(comboSales.getOrDefault(recipe.getComboId(), 0))))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        double rate = consumed.doubleValue() / elapsedHours;
        Double hoursLeft = rate <= 0 ? null : item.getCurrentStock().doubleValue() / rate;
        String risk = item.getCurrentStock().compareTo(item.getReorderLevel()) <= 0 || (hoursLeft != null && hoursLeft <= 3) ? "CRITICAL"
                : hoursLeft != null && hoursLeft <= 6 ? "WARNING" : "HEALTHY";
        String message = hoursLeft == null ? "Chưa đủ dữ liệu bán hôm nay để dự báo"
                : "Có thể hết " + item.getName() + " sau khoảng " + Math.max(1, Math.round(hoursLeft)) + " giờ";
        Map<String, Object> result = itemRow(item);
        result.put("consumedToday", consumed); result.put("burnRatePerHour", round(rate)); result.put("hoursUntilStockout", hoursLeft == null ? null : round(hoursLeft));
        result.put("risk", risk); result.put("message", message);
        return result;
    }

    private Map<String, Object> itemRow(InventoryItem item) {
        return row("id", item.getId(), "name", item.getName(), "unit", item.getUnit(), "currentStock", item.getCurrentStock(),
                "reorderLevel", item.getReorderLevel(), "active", item.isActive());
    }
    private BigDecimal nonNegative(BigDecimal value) { value = value == null ? BigDecimal.ZERO : value; if (value.signum() < 0) throw new BadRequestException("Số lượng không được âm"); return value; }
    private double round(double value) { return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP).doubleValue(); }
    private Map<String, Object> row(Object... values) { Map<String, Object> row = new LinkedHashMap<>(); for (int i = 0; i < values.length; i += 2) row.put((String) values[i], values[i + 1]); return row; }
}
