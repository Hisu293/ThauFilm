package com.filmticket.service;

import com.filmticket.dto.MovieStreamResponse;
import com.filmticket.entity.Booking;
import com.filmticket.entity.BookingStatus;
import com.filmticket.entity.Movie;
import com.filmticket.entity.OnlineMovieView;
import com.filmticket.entity.OnlineViewingSession;
import com.filmticket.entity.Showtime;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.BookingRepository;
import com.filmticket.repository.MovieRepository;
import com.filmticket.repository.OnlineMovieViewRepository;
import com.filmticket.repository.OnlineViewingSessionRepository;
import com.filmticket.repository.ShowtimeRepository;
import com.filmticket.model.ShowtimeStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MovieStreamService {
    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter AMZ_DATE = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'")
            .withZone(ZoneOffset.UTC);
    private static final DateTimeFormatter DATE_STAMP = DateTimeFormatter.ofPattern("yyyyMMdd")
            .withZone(ZoneOffset.UTC);

    private final MovieRepository movieRepository;
    private final ShowtimeRepository showtimeRepository;
    private final BookingRepository bookingRepository;
    private final OnlineMovieViewRepository onlineMovieViewRepository;
    private final OnlineViewingSessionRepository onlineViewingSessionRepository;
    private final AuditLogService auditLogService;

    @Value("${app.streaming.session-timeout-seconds:90}")
    private long sessionTimeoutSeconds;

    @Value("${app.streaming.s3.bucket:}")
    private String s3Bucket;

    @Value("${app.streaming.s3.region:ap-southeast-1}")
    private String s3Region;

    @Value("${app.streaming.s3.access-key:}")
    private String s3AccessKey;

    @Value("${app.streaming.s3.secret-key:}")
    private String s3SecretKey;

    @Value("${app.streaming.public-base-url:}")
    private String publicBaseUrl;

    @Value("${app.streaming.url-ttl-seconds:300}")
    private long ttlSeconds;

    @Transactional
    public MovieStreamResponse getMovieStream(
            UUID movieId,
            UUID userId,
            boolean bypassPurchaseCheck,
            String deviceId) {
        String normalizedDeviceId = requireDeviceId(deviceId);
        Movie movie = movieRepository.findById(movieId)
                .orElseThrow(() -> new BadRequestException("Movie not found"));
        if (!movie.isActive()) {
            throw new BadRequestException("Movie is not available");
        }
        Instant accessExpiresAt = null;
        Booking streamingBooking = null;
        Showtime streamingShowtime = null;
        if (!bypassPurchaseCheck) {
            List<Booking> eligibleBookings = bookingRepository.findEligibleStreamingBookings(
                    userId,
                    movieId,
                    BookingStatus.CONFIRMED,
                    java.time.LocalDateTime.now(VIETNAM_ZONE)
            );
            if (eligibleBookings.isEmpty()) {
                throw new BadRequestException("Bạn chỉ có thể xem phim trong khung giờ suất chiếu đã đặt và đã thanh toán");
            }
            streamingBooking = eligibleBookings.get(0);
            streamingBooking = bookingRepository.findByIdForUpdate(streamingBooking.getId())
                    .orElseThrow(() -> new BadRequestException("Booking not found"));
            streamingShowtime = showtimeRepository.findById(streamingBooking.getShowtimeId())
                    .orElseThrow(() -> new BadRequestException("Showtime not found"));
            validateStreamingAccess(streamingBooking, streamingShowtime, movieId, userId,
                    LocalDateTime.now(VIETNAM_ZONE));
            accessExpiresAt = streamingShowtime.getEndTime().atZone(VIETNAM_ZONE).toInstant();
            acquireViewingSession(streamingBooking, movieId, userId, normalizedDeviceId);
        }
        MovieStreamResponse response = buildResponse(movie, accessExpiresAt,
                streamingBooking == null ? null : streamingBooking.getId(),
                streamingShowtime == null ? null : streamingShowtime.getId());
        if (streamingBooking != null && streamingShowtime != null) {
            recordView(userId, movieId, streamingBooking.getId(), streamingShowtime.getId());
        }
        return response;
    }

    @Transactional
    public MovieStreamResponse getWatchPartyStream(
            Movie movie,
            UUID userId,
            UUID bookingId,
            UUID showtimeId,
            String deviceId) {
        String normalizedDeviceId = requireDeviceId(deviceId);
        Booking booking = bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy booking Watch Party"));
        if (!booking.getUserId().equals(userId)
                || booking.getStatus() != BookingStatus.CONFIRMED
                || !booking.getShowtimeId().equals(showtimeId)) {
            throw new BadRequestException("Booking Watch Party không hợp lệ hoặc chưa thanh toán");
        }
        Showtime showtime = showtimeRepository.findById(showtimeId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy suất chiếu Watch Party"));
        LocalDateTime now = LocalDateTime.now(VIETNAM_ZONE);
        if (now.isBefore(showtime.getStartTime()) || !now.isBefore(showtime.getEndTime())) {
            throw new BadRequestException("Chỉ có thể xem phim trong thời gian của suất chiếu đã thanh toán");
        }
        validateStreamingAccess(booking, showtime, movie.getId(), userId, LocalDateTime.now(VIETNAM_ZONE));
        acquireViewingSession(booking, movie.getId(), userId, normalizedDeviceId);
        MovieStreamResponse response = buildResponse(
                movie, showtime.getEndTime().atZone(VIETNAM_ZONE).toInstant(), bookingId, showtimeId);
        recordView(userId, movie.getId(), bookingId, showtimeId);
        return response;
    }

    @Transactional(noRollbackFor = BadRequestException.class)
    public void heartbeat(UUID movieId, UUID userId, String deviceId) {
        OnlineViewingSession session = onlineViewingSessionRepository
                .findByUserIdAndMovieIdAndDeviceId(userId, movieId, requireDeviceId(deviceId))
                .orElseThrow(() -> new BadRequestException(
                        "Phiên xem không còn hiệu lực. Vui lòng mở lại phim."));
        heartbeatSession(session, movieId, userId);
    }

    @Transactional
    public void release(UUID movieId, UUID userId, String deviceId) {
        onlineViewingSessionRepository
                .findByUserIdAndMovieIdAndDeviceId(userId, movieId, requireDeviceId(deviceId))
                .ifPresent(onlineViewingSessionRepository::delete);
    }

    @Transactional(noRollbackFor = BadRequestException.class)
    public void heartbeatBooking(UUID bookingId, UUID userId, String deviceId) {
        OnlineViewingSession session = requireOwnedBookingSession(bookingId, userId, deviceId);
        heartbeatSession(session, session.getMovieId(), userId);
    }

    @Transactional(noRollbackFor = BadRequestException.class)
    public void heartbeatBooking(UUID movieId, UUID bookingId, UUID userId, String deviceId) {
        OnlineViewingSession session = requireOwnedBookingSession(bookingId, userId, deviceId);
        if (!session.getMovieId().equals(movieId)) {
            revokeSession(session, "Phiên xem không thuộc phim này");
        }
        heartbeatSession(session, movieId, userId);
    }

    @Transactional
    public void releaseBooking(UUID bookingId, UUID userId, String deviceId) {
        OnlineViewingSession session = onlineViewingSessionRepository.findByBookingId(bookingId).orElse(null);
        if (session != null
                && session.getUserId().equals(userId)
                && session.getDeviceId().equals(requireDeviceId(deviceId))) {
            onlineViewingSessionRepository.delete(session);
        }
    }

    @Transactional
    public void releaseBooking(UUID movieId, UUID bookingId, UUID userId, String deviceId) {
        OnlineViewingSession session = onlineViewingSessionRepository.findByBookingId(bookingId).orElse(null);
        if (session != null && session.getMovieId().equals(movieId)
                && session.getUserId().equals(userId)
                && session.getDeviceId().equals(requireDeviceId(deviceId))) {
            onlineViewingSessionRepository.delete(session);
        }
    }

    private void heartbeatSession(OnlineViewingSession session, UUID movieId, UUID userId) {
        Booking booking = bookingRepository.findById(session.getBookingId()).orElse(null);
        Showtime showtime = booking == null ? null : showtimeRepository.findById(booking.getShowtimeId()).orElse(null);
        try {
            if (booking == null || showtime == null) {
                throw new BadRequestException("Booking hoặc suất chiếu không còn tồn tại");
            }
            validateStreamingAccess(booking, showtime, movieId, userId, LocalDateTime.now(VIETNAM_ZONE));
            session.setLastHeartbeatAt(LocalDateTime.now(VIETNAM_ZONE));
        } catch (BadRequestException ex) {
            revokeSession(session, ex.getMessage());
        }
    }

    private void revokeSession(OnlineViewingSession session, String reason) {
        onlineViewingSessionRepository.delete(session);
        onlineViewingSessionRepository.flush();
        throw new BadRequestException(reason + ". Phiên xem đã được thu hồi.");
    }

    private void validateStreamingAccess(Booking booking, Showtime showtime, UUID movieId,
                                         UUID userId, LocalDateTime now) {
        if (!booking.getUserId().equals(userId) || booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new BadRequestException("Booking không hợp lệ hoặc chưa thanh toán");
        }
        if (!booking.getShowtimeId().equals(showtime.getId()) || !showtime.getMovieId().equals(movieId)) {
            throw new BadRequestException("Booking không thuộc phim hoặc suất chiếu này");
        }
        if (!showtime.isOnline() || showtime.getStatus() == ShowtimeStatus.CANCELLED) {
            throw new BadRequestException("Suất chiếu online đã bị hủy hoặc không còn khả dụng");
        }
        if (now.isBefore(showtime.getStartTime())) {
            throw new BadRequestException("Chưa đến giờ xem của suất chiếu đã đặt");
        }
        if (!now.isBefore(showtime.getEndTime())) {
            throw new BadRequestException("Suất chiếu đã kết thúc");
        }
    }

    @Scheduled(fixedDelayString = "${app.streaming.session-cleanup-ms:30000}")
    @Transactional
    public void revokeExpiredSessions() {
        LocalDateTime now = LocalDateTime.now(VIETNAM_ZONE);
        List<OnlineViewingSession> expired = onlineViewingSessionRepository.findAll().stream()
                .filter(session -> {
                    Booking booking = bookingRepository.findById(session.getBookingId()).orElse(null);
                    if (booking == null || booking.getStatus() != BookingStatus.CONFIRMED) return true;
                    Showtime showtime = showtimeRepository.findById(booking.getShowtimeId()).orElse(null);
                    return showtime == null || !showtime.isOnline()
                            || showtime.getStatus() == ShowtimeStatus.CANCELLED
                            || !showtime.getMovieId().equals(session.getMovieId())
                            || !now.isBefore(showtime.getEndTime());
                })
                .toList();
        if (!expired.isEmpty()) onlineViewingSessionRepository.deleteAll(expired);
    }

    private OnlineViewingSession requireOwnedBookingSession(UUID bookingId, UUID userId, String deviceId) {
        String normalizedDeviceId = requireDeviceId(deviceId);
        OnlineViewingSession session = onlineViewingSessionRepository.findByBookingId(bookingId)
                .orElseThrow(() -> new BadRequestException(
                        "Phiên xem không còn hiệu lực. Vui lòng mở lại phim."));
        if (!session.getUserId().equals(userId) || !session.getDeviceId().equals(normalizedDeviceId)) {
            throw new BadRequestException("Phiên xem thuộc thiết bị khác");
        }
        return session;
    }

    private void acquireViewingSession(Booking booking, UUID movieId, UUID userId, String deviceId) {
        LocalDateTime now = LocalDateTime.now(VIETNAM_ZONE);
        LocalDateTime staleBefore = now.minusSeconds(Math.max(30, sessionTimeoutSeconds));
        OnlineViewingSession session = onlineViewingSessionRepository.findByBookingId(booking.getId())
                .orElse(null);

        if (session != null
                && !session.getDeviceId().equals(deviceId)
                && session.getLastHeartbeatAt().isAfter(staleBefore)) {
            auditLogService.failure(AuditLogService.AuditCommand.builder()
                    .action(AuditAction.CONCURRENT_STREAM_BLOCKED).targetType("BOOKING")
                    .targetId(booking.getId().toString()).actorId(userId)
                    .description("Đã chặn xem phim đồng thời trên thiết bị khác")
                    .correlationId(booking.getId().toString()).sensitive(true)
                    .metadata(Map.of("mãPhim", movieId, "dấuVânTayThiếtBị", hex(sha256(deviceId)))).build(),
                    new IllegalStateException("Vé đang được sử dụng trên một thiết bị khác"));
            throw new BadRequestException(
                    "Vé này đang được xem trên một thiết bị khác. Hãy đóng phiên đó hoặc thử lại sau.");
        }

        boolean newSession = session == null;
        boolean replacedDevice = session != null && !session.getDeviceId().equals(deviceId);
        if (session == null) {
            session = OnlineViewingSession.builder()
                    .bookingId(booking.getId())
                    .userId(userId)
                    .movieId(movieId)
                    .deviceId(deviceId)
                    .startedAt(now)
                    .lastHeartbeatAt(now)
                    .build();
        } else {
            session.setUserId(userId);
            session.setMovieId(movieId);
            session.setDeviceId(deviceId);
            session.setStartedAt(now);
            session.setLastHeartbeatAt(now);
        }
        onlineViewingSessionRepository.save(session);
        if (newSession || replacedDevice) {
            auditLogService.success(AuditLogService.AuditCommand.builder()
                    .action(replacedDevice ? AuditAction.STREAM_DEVICE_REPLACED : AuditAction.STREAM_DEVICE_REGISTERED)
                    .targetType("ONLINE_VIEWING_SESSION").targetId(session.getId().toString())
                    .actorId(userId).description(replacedDevice
                            ? "Đã thay thế thiết bị xem phim online"
                            : "Đã đăng ký thiết bị xem phim online")
                    .correlationId(booking.getId().toString()).sensitive(true)
                    .metadata(Map.of("mãPhim", movieId, "dấuVânTayThiếtBị", hex(sha256(deviceId)))).build());
        }
    }

    private String requireDeviceId(String deviceId) {
        String normalized = blankToNull(deviceId);
        if (normalized == null || normalized.length() > 100) {
            throw new BadRequestException("Thiếu mã thiết bị xem phim hợp lệ");
        }
        return normalized;
    }

    public MovieStreamResponse buildResponseAndRecord(Movie movie, UUID userId) {
        MovieStreamResponse response = buildResponse(movie, null);
        recordView(userId, movie.getId(), null, null);
        return response;
    }

    public MovieStreamResponse buildResponse(Movie movie) {
        return buildResponse(movie, null);
    }

    public MovieStreamResponse buildResponse(Movie movie, Instant accessExpiresAt) {
        return buildResponse(movie, accessExpiresAt, null, null);
    }

    public MovieStreamResponse buildResponse(Movie movie, Instant accessExpiresAt,
                                             UUID bookingId, UUID showtimeId) {
        String streamKey = blankToNull(movie.getStreamKey());
        if (streamKey == null) {
            throw new BadRequestException("Online stream is not configured for this movie");
        }
        String provider = blankToDefault(movie.getStreamProvider(), "S3");
        Instant ttlExpiresAt = Instant.now().plusSeconds(Math.max(60, ttlSeconds));
        Instant expiresAt = accessExpiresAt == null || ttlExpiresAt.isBefore(accessExpiresAt)
                ? ttlExpiresAt
                : accessExpiresAt;
        boolean publicStream = !isAbsoluteUrl(streamKey) && !hasS3Credentials();
        String streamUrl = isAbsoluteUrl(streamKey)
                ? streamKey
                : publicStream ? buildPublicS3Url(streamKey) : presignS3Url(streamKey, expiresAt);
        return MovieStreamResponse.builder()
                .movieId(movie.getId())
                .bookingId(bookingId)
                .showtimeId(showtimeId)
                .title(movie.getTitle())
                .streamUrl(streamUrl)
                .expiresAt(accessExpiresAt == null ? expiresAt : accessExpiresAt)
                .provider(provider)
                .build();
    }

    private void recordView(UUID userId, UUID movieId, UUID bookingId, UUID showtimeId) {
        onlineMovieViewRepository.save(OnlineMovieView.builder()
                .userId(userId)
                .movieId(movieId)
                .showtimeId(showtimeId)
                .bookingId(bookingId)
                .viewedAt(java.time.LocalDateTime.now(VIETNAM_ZONE))
                .build());
    }

    private boolean hasS3Credentials() {
        return blankToNull(s3AccessKey) != null && blankToNull(s3SecretKey) != null;
    }

    private String buildPublicS3Url(String objectKey) {
        String configuredBaseUrl = blankToNull(publicBaseUrl);
        if (configuredBaseUrl != null) {
            return configuredBaseUrl.replaceAll("/+$", "") + "/" + encodePath(objectKey);
        }

        String bucket = blankToNull(s3Bucket);
        String region = blankToNull(s3Region);
        if (bucket == null || region == null) {
            throw new BadRequestException("S3 public streaming is not configured");
        }
        return "https://" + bucket + ".s3." + region + ".amazonaws.com/" + encodePath(objectKey);
    }

    private String presignS3Url(String objectKey, Instant expiresAt) {
        String bucket = blankToNull(s3Bucket);
        String region = blankToNull(s3Region);
        String accessKey = blankToNull(s3AccessKey);
        String secretKey = blankToNull(s3SecretKey);
        if (bucket == null || region == null || accessKey == null || secretKey == null) {
            throw new BadRequestException("S3 streaming is not configured");
        }

        Instant now = Instant.now();
        long expires = Math.max(1, Math.min(604800, expiresAt.getEpochSecond() - now.getEpochSecond()));
        String amzDate = AMZ_DATE.format(now);
        String dateStamp = DATE_STAMP.format(now);
        String host = bucket + ".s3." + region + ".amazonaws.com";
        String credentialScope = dateStamp + "/" + region + "/s3/aws4_request";

        Map<String, String> params = new TreeMap<>();
        params.put("X-Amz-Algorithm", "AWS4-HMAC-SHA256");
        params.put("X-Amz-Credential", accessKey + "/" + credentialScope);
        params.put("X-Amz-Date", amzDate);
        params.put("X-Amz-Expires", String.valueOf(expires));
        params.put("X-Amz-SignedHeaders", "host");

        String canonicalUri = "/" + encodePath(objectKey);
        String canonicalQuery = canonicalQuery(params);
        String canonicalRequest = "GET\n" + canonicalUri + "\n" + canonicalQuery + "\n" +
                "host:" + host + "\n\nhost\nUNSIGNED-PAYLOAD";
        String stringToSign = "AWS4-HMAC-SHA256\n" + amzDate + "\n" + credentialScope + "\n" +
                hex(sha256(canonicalRequest));
        String signature = hex(hmac(signingKey(secretKey, dateStamp, region), stringToSign));

        return "https://" + host + canonicalUri + "?" + canonicalQuery + "&X-Amz-Signature=" + signature;
    }

    private byte[] signingKey(String secretKey, String dateStamp, String region) {
        byte[] dateKey = hmac(("AWS4" + secretKey).getBytes(StandardCharsets.UTF_8), dateStamp);
        byte[] regionKey = hmac(dateKey, region);
        byte[] serviceKey = hmac(regionKey, "s3");
        return hmac(serviceKey, "aws4_request");
    }

    private byte[] hmac(byte[] key, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key, "HmacSHA256"));
            return mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        } catch (Exception ex) {
            throw new BadRequestException("Cannot sign S3 stream URL");
        }
    }

    private byte[] sha256(String value) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
        } catch (Exception ex) {
            throw new BadRequestException("Cannot sign S3 stream URL");
        }
    }

    private String canonicalQuery(Map<String, String> params) {
        return params.entrySet().stream()
                .map(entry -> encode(entry.getKey()) + "=" + encode(entry.getValue()))
                .reduce((left, right) -> left + "&" + right)
                .orElse("");
    }

    private String encodePath(String value) {
        String normalized = value.replace("\\", "/").replaceAll("^/+", "");
        String[] parts = normalized.split("/");
        StringBuilder encoded = new StringBuilder();
        for (int i = 0; i < parts.length; i++) {
            if (i > 0) encoded.append('/');
            encoded.append(encode(parts[i]));
        }
        return encoded.toString();
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8)
                .replace("+", "%20")
                .replace("%7E", "~");
    }

    private String hex(byte[] bytes) {
        StringBuilder builder = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            builder.append(String.format("%02x", b));
        }
        return builder.toString();
    }

    private boolean isAbsoluteUrl(String value) {
        return value.startsWith("http://") || value.startsWith("https://");
    }

    private String blankToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isBlank() ? null : trimmed;
    }

    private String blankToDefault(String value, String defaultValue) {
        String normalized = blankToNull(value);
        return normalized == null ? defaultValue : normalized;
    }
}
