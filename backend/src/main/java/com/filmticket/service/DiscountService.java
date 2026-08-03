package com.filmticket.service;

import com.filmticket.dto.DiscountResponse;
import com.filmticket.entity.Discount;
import com.filmticket.entity.DiscountUsage;
import com.filmticket.entity.LoyaltyRedemption;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.DiscountRepository;
import com.filmticket.repository.DiscountUsageRepository;
import com.filmticket.repository.LoyaltyRedemptionRepository;
import com.filmticket.repository.BookingRepository;
import com.filmticket.repository.CinemaRoomRepository;
import com.filmticket.repository.LoyaltyAccountRepository;
import com.filmticket.repository.MovieRepository;
import com.filmticket.repository.PaymentRepository;
import com.filmticket.repository.ShowtimeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.Set;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class DiscountService {

    private final DiscountRepository discountRepository;
    private final DiscountUsageRepository discountUsageRepository;
    private final LoyaltyRedemptionRepository loyaltyRedemptionRepository;
    private final BookingRepository bookingRepository;
    private final ShowtimeRepository showtimeRepository;
    private final CinemaRoomRepository cinemaRoomRepository;
    private final MovieRepository movieRepository;
    private final LoyaltyAccountRepository loyaltyAccountRepository;
    private final PaymentRepository paymentRepository;

    public List<DiscountResponse> getActiveDiscounts() {
        return discountRepository.findAll().stream()
                .filter(this::isActive)
                .map(DiscountResponse::fromDiscount)
                .toList();
    }

    @Transactional
    public BigDecimal calculateDiscount(String code, BigDecimal totalAmount, UUID userId) {
        return calculateDiscount(code, totalAmount, userId, null);
    }

    @Transactional
    public BigDecimal calculateDiscount(String code, BigDecimal totalAmount, UUID userId, List<String> seatTypes) {
        throw new UnsupportedOperationException("Vui lòng sử dụng hàm đánh giá khuyến mãi có đầy đủ thông tin booking");
    }

    @Transactional(readOnly = true)
    public AppliedDiscount evaluateDiscount(String code, BigDecimal totalAmount, UUID userId,
                                            List<String> seatTypes, com.filmticket.entity.Booking booking) {
        String normalizedCode = code.trim().toUpperCase();
        Discount discount = discountRepository.findByCodeAndActiveTrue(normalizedCode)
                .orElseThrow(() -> new BadRequestException("Mã khuyến mãi không hợp lệ"));

        if (!isActive(discount)) {
            throw new BadRequestException("Mã khuyến mãi đã hết hạn hoặc ngừng hoạt động");
        }
        LoyaltyRedemption rewardRedemption = loyaltyRedemptionRepository.findByDiscountId(discount.getId()).orElse(null);
        if (rewardRedemption != null) {
            if (!rewardRedemption.getUserId().equals(userId)) {
                throw new BadRequestException("Mã đổi điểm này chỉ dành cho tài khoản đã đổi quà");
            }
            if (!"AVAILABLE".equals(rewardRedemption.getStatus())) {
                throw new BadRequestException("Mã đổi điểm đã được sử dụng hoặc hết hạn");
            }
        }
        long userUsageCount = paymentRepository.countByDiscountIdAndPaidByUserIdAndStatus(
                discount.getId(), userId, com.filmticket.entity.PaymentStatus.PAID);
        int perUserLimit = discount.getPerUserLimit() == null ? 1 : discount.getPerUserLimit();
        if (userUsageCount >= perUserLimit) {
            throw new BadRequestException("Bạn đã sử dụng hết số lượt của mã khuyến mãi này");
        }
        Integer usageLimit = discount.getUsageLimit();
        Integer usageCount = discount.getUsageCount() == null ? 0 : discount.getUsageCount();
        if (usageLimit != null && usageLimit > 0 && usageCount >= usageLimit) {
            throw new BadRequestException("Mã khuyến mãi đã hết lượt sử dụng");
        }
        if (totalAmount.compareTo(discount.getMinPurchaseAmount()) < 0) {
            throw new BadRequestException("Đơn hàng chưa đạt giá trị tối thiểu để áp dụng mã");
        }

        validateCampaignConditions(discount, userId, booking);

        // Validate seat type restriction
        boolean onlineBooking = showtimeRepository.findById(booking.getShowtimeId()).map(com.filmticket.entity.Showtime::isOnline).orElse(false);
        if (!onlineBooking && discount.getApplicableSeatTypes() != null && !discount.getApplicableSeatTypes().isBlank()) {
            if (seatTypes == null || seatTypes.isEmpty()) {
                throw new BadRequestException("Mã chỉ áp dụng cho loại ghế: " + discount.getApplicableSeatTypes());
            }
            List<String> allowedTypes = java.util.Arrays.stream(discount.getApplicableSeatTypes().toUpperCase().split(","))
                    .map(String::trim).toList();
            boolean hasMatch = seatTypes.stream().anyMatch(t -> allowedTypes.contains(t.toUpperCase()));
            if (!hasMatch) {
                throw new BadRequestException("Mã chỉ áp dụng cho loại ghế: " + discount.getApplicableSeatTypes());
            }
        }

        BigDecimal discountAmount;
        if ("PERCENTAGE".equalsIgnoreCase(discount.getType()) || "PERCENT".equalsIgnoreCase(discount.getType())) {
            discountAmount = totalAmount.multiply(discount.getValue())
                    .divide(BigDecimal.valueOf(100));
        } else if ("FIXED".equalsIgnoreCase(discount.getType())) {
            discountAmount = discount.getValue();
        } else {
            throw new BadRequestException("Loại khuyến mãi không được hỗ trợ: " + discount.getType());
        }

        if (discount.getMaxDiscountAmount() != null
                && discount.getMaxDiscountAmount().compareTo(BigDecimal.ZERO) > 0
                && discountAmount.compareTo(discount.getMaxDiscountAmount()) > 0) {
            discountAmount = discount.getMaxDiscountAmount();
        }
        discountAmount = discountAmount.min(totalAmount).max(BigDecimal.ZERO);

        BigDecimal budgetUsed = discount.getBudgetUsed() == null ? BigDecimal.ZERO : discount.getBudgetUsed();
        if (discount.getBudgetLimit() != null
                && budgetUsed.add(discountAmount).compareTo(discount.getBudgetLimit()) > 0) {
            throw new BadRequestException("Ngân sách chiến dịch không còn đủ cho đơn hàng này");
        }
        return new AppliedDiscount(discount.getId(), discount.getCode(), discountAmount);
    }

    @Transactional
    public void confirmUsage(com.filmticket.entity.Payment payment) {
        if (payment.getDiscountId() == null || payment.getDiscountAmount() == null
                || payment.getDiscountAmount().signum() <= 0) return;
        Discount discount = discountRepository.findByIdForUpdate(payment.getDiscountId())
                .orElseThrow(() -> new BadRequestException("Không tìm thấy chiến dịch khuyến mãi của thanh toán"));
        int usageCount = discount.getUsageCount() == null ? 0 : discount.getUsageCount();
        discount.setUsageCount(usageCount + 1);
        BigDecimal used = (discount.getBudgetUsed() == null ? BigDecimal.ZERO : discount.getBudgetUsed())
                .add(payment.getDiscountAmount());
        discount.setBudgetUsed(used);
        if (discount.getUsageLimit() != null && discount.getUsageCount() >= discount.getUsageLimit()
                || discount.getBudgetLimit() != null && used.compareTo(discount.getBudgetLimit()) >= 0) {
            discount.setActive(false);
        }
        discountRepository.save(discount);
        discountUsageRepository.save(DiscountUsage.builder()
                .discountId(discount.getId()).userId(payment.getPaidByUserId()).build());
        loyaltyRedemptionRepository.findByDiscountId(discount.getId()).ifPresent(redemption -> {
            redemption.setStatus("USED");
            redemption.setUsedAt(LocalDateTime.now());
            loyaltyRedemptionRepository.save(redemption);
        });
    }

    private void validateCampaignConditions(Discount discount, UUID userId, com.filmticket.entity.Booking booking) {
        var showtime = showtimeRepository.findById(booking.getShowtimeId())
                .orElseThrow(() -> new BadRequestException("Không tìm thấy suất chiếu để kiểm tra khuyến mãi"));
        var movie = movieRepository.findById(showtime.getMovieId())
                .orElseThrow(() -> new BadRequestException("Không tìm thấy phim để kiểm tra khuyến mãi"));
        var room = showtime.getCinemaRoomId() == null ? null : cinemaRoomRepository.findById(showtime.getCinemaRoomId()).orElse(null);
        String channel = booking.getConfirmationCode() != null && booking.getConfirmationCode().startsWith("WP")
                ? "WATCH_PARTY" : showtime.isOnline() ? "ONLINE" : "CINEMA";
        requireIncluded(discount.getApplicableChannels(), channel, "Mã không áp dụng cho kênh mua vé này");
        requireIncluded(discount.getApplicableMovieIds(), movie.getId().toString(), "Mã không áp dụng cho phim này");
        requireIncluded(discount.getApplicableShowtimeIds(), showtime.getId().toString(), "Mã không áp dụng cho suất chiếu này");
        if (room != null) {
            requireIncluded(discount.getApplicableRoomIds(), room.getId().toString(), "Mã không áp dụng cho phòng chiếu này");
            requireIncluded(discount.getApplicableTheaterIds(), String.valueOf(room.getTheaterId()), "Mã không áp dụng cho rạp này");
        } else if (discount.getApplicableRoomIds() != null || discount.getApplicableTheaterIds() != null) {
            throw new BadRequestException("Mã chỉ áp dụng cho vé tại rạp");
        }
        if (discount.getApplicableGenres() != null) {
            Set<String> allowed = csv(discount.getApplicableGenres());
            boolean matches = java.util.Arrays.stream(String.valueOf(movie.getGenre()).split(","))
                    .map(value -> value.trim().toUpperCase(Locale.ROOT)).anyMatch(allowed::contains);
            if (!matches) throw new BadRequestException("Mã không áp dụng cho thể loại phim này");
        }
        String weekday = showtime.getStartTime().getDayOfWeek().name();
        requireIncluded(discount.getApplicableWeekdays(), weekday, "Mã không áp dụng vào ngày này trong tuần");
        var time = showtime.getStartTime().toLocalTime();
        if (discount.getStartHour() != null && time.isBefore(discount.getStartHour())
                || discount.getEndHour() != null && time.isAfter(discount.getEndHour())) {
            throw new BadRequestException("Suất chiếu nằm ngoài khung giờ áp dụng khuyến mãi");
        }
        int lifetime = loyaltyAccountRepository.findByUserId(userId).map(a -> a.getLifetimeEarned()).orElse(0);
        int actualTier = lifetime >= 10_000 ? 3 : lifetime >= 5_000 ? 2 : 1;
        int requiredTier = switch (String.valueOf(discount.getMinimumMemberTier())) {
            case "V_PLATINUM" -> 3; case "V_DIAMOND" -> 2; default -> 1;
        };
        if (actualTier < requiredTier) throw new BadRequestException("Hạng thành viên của bạn chưa đủ điều kiện áp dụng mã");
        long confirmedBookings = bookingRepository.countByUserIdAndStatus(userId, com.filmticket.entity.BookingStatus.CONFIRMED);
        if ("NEW".equals(discount.getCustomerSegment()) && confirmedBookings > 0)
            throw new BadRequestException("Mã chỉ dành cho khách hàng mới");
        if ("RETURNING".equals(discount.getCustomerSegment()) && confirmedBookings == 0)
            throw new BadRequestException("Mã chỉ dành cho khách hàng đã từng mua vé");
    }

    private void requireIncluded(String csv, String value, String message) {
        if (csv != null && !csv.isBlank() && !csv(csv).contains(value.toUpperCase(Locale.ROOT)))
            throw new BadRequestException(message);
    }

    private Set<String> csv(String raw) {
        return java.util.Arrays.stream(raw.split(",")).map(String::trim)
                .map(value -> value.toUpperCase(Locale.ROOT)).collect(java.util.stream.Collectors.toSet());
    }

    public record AppliedDiscount(UUID discountId, String code, BigDecimal amount) {}

    private boolean isActive(Discount discount) {
        LocalDateTime now = LocalDateTime.now();
        return discount.isActive()
                && !now.isBefore(discount.getValidFrom())
                && !now.isAfter(discount.getValidTo());
    }
}
