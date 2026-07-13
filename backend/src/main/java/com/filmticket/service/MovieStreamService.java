package com.filmticket.service;

import com.filmticket.dto.MovieStreamResponse;
import com.filmticket.entity.Booking;
import com.filmticket.entity.BookingStatus;
import com.filmticket.entity.Movie;
import com.filmticket.entity.OnlineMovieView;
import com.filmticket.entity.Showtime;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.BookingRepository;
import com.filmticket.repository.MovieRepository;
import com.filmticket.repository.OnlineMovieViewRepository;
import com.filmticket.repository.ShowtimeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
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
    public MovieStreamResponse getMovieStream(UUID movieId, UUID userId, boolean bypassPurchaseCheck) {
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
            streamingShowtime = showtimeRepository.findById(streamingBooking.getShowtimeId())
                    .orElseThrow(() -> new BadRequestException("Showtime not found"));
            accessExpiresAt = streamingShowtime.getEndTime().atZone(VIETNAM_ZONE).toInstant();
        }
        MovieStreamResponse response = buildResponse(movie, accessExpiresAt);
        if (streamingBooking != null && streamingShowtime != null) {
            recordView(userId, movieId, streamingBooking.getId(), streamingShowtime.getId());
        }
        return response;
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
                .title(movie.getTitle())
                .streamUrl(streamUrl)
                .expiresAt(isAbsoluteUrl(streamKey) || publicStream ? null : expiresAt)
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
