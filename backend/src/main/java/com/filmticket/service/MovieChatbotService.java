package com.filmticket.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.filmticket.dto.MovieChatRequest;
import com.filmticket.dto.MovieChatResponse;
import com.filmticket.entity.Movie;
import com.filmticket.entity.Showtime;
import com.filmticket.entity.CinemaRoom;
import com.filmticket.entity.Theater;
import com.filmticket.model.TheaterStatus;
import com.filmticket.repository.CinemaRoomRepository;
import com.filmticket.repository.MovieRepository;
import com.filmticket.repository.ShowtimeRepository;
import com.filmticket.repository.TheaterRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.text.Normalizer;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class MovieChatbotService {
    private static final String GEMINI_ENDPOINT =
            "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent";
    private static final int DURATION_TOLERANCE_MINUTES = 10;
    private static final Pattern MAX_DURATION_PATTERN = Pattern.compile(
            "(?:duoi|under|less than|khong qua|toi da|<=?)\\s*(\\d{1,3})\\s*(tieng|h|hour|hours|phut|p|min|minutes)?",
            Pattern.CASE_INSENSITIVE
    );
    private static final Pattern MIN_DURATION_PATTERN = Pattern.compile(
            "(?:tren|hon|over|more than|tu)\\s*(\\d{1,3})\\s*(tieng|h|hour|hours|phut|p|min|minutes)?",
            Pattern.CASE_INSENSITIVE
    );
    private static final Pattern NEAR_DURATION_PATTERN = Pattern.compile(
            "(?:khoang|tam|gan|around|about)?\\s*(\\d{1,3})\\s*(tieng|h|hour|hours|phut|p|min|minutes)\\b",
            Pattern.CASE_INSENSITIVE
    );
    private static final Set<String> MOVIE_SIGNALS = Set.of(
            "phim", "movie", "cinema", "dien anh", "rap", "suat chieu", "dang chieu", "sap chieu",
            "goi y", "de xuat", "recommend", "xem gi", "co gi hay", "thoi luong", "dao dien", "dien vien"
    );
    private static final Set<String> MOVIE_FOLLOW_UP_SIGNALS = Set.of(
            "con nao", "con phim nao", "khac di", "phim khac", "them nua", "ngan hon", "dai hon", "doi gu"
    );
    private static final List<GenreDefinition> SUPPORTED_GENRES = List.of(
            genre("action", "hành động", "action", "hanh dong"),
            genre("adventure", "phiêu lưu", "adventure", "phieu luu"),
            genre("animation", "hoạt hình", "animation", "animated", "hoat hinh"),
            genre("biography", "tiểu sử", "biography", "biographical", "tieu su"),
            genre("comedy", "hài", "comedy", "hai"),
            genre("crime", "hình sự", "crime", "hinh su", "toi pham"),
            genre("documentary", "tài liệu", "documentary", "tai lieu"),
            genre("drama", "chính kịch", "drama", "chinh kich"),
            genre("family", "gia đình", "family", "gia dinh"),
            genre("fantasy", "giả tưởng", "fantasy", "gia tuong", "ky ao"),
            genre("history", "lịch sử", "history", "historical", "lich su"),
            genre("horror", "kinh dị", "horror", "kinh di"),
            genre("music", "âm nhạc", "music", "am nhac"),
            genre("musical", "nhạc kịch", "musical", "nhac kich"),
            genre("mystery", "bí ẩn", "mystery", "bi an", "trinh tham"),
            genre("romance", "lãng mạn", "romance", "romantic", "lang man", "tinh cam"),
            genre("science_fiction", "khoa học viễn tưởng", "science fiction", "sci fi", "scifi", "khoa hoc vien tuong", "vien tuong"),
            genre("sport", "thể thao", "sport", "sports", "the thao"),
            genre("thriller", "giật gân", "thriller", "giat gan"),
            genre("war", "chiến tranh", "war", "chien tranh"),
            genre("western", "viễn Tây", "western", "vien tay"),
            genre("superhero", "siêu anh hùng", "superhero", "super hero", "sieu anh hung"),
            genre("psychological", "tâm lý", "psychological", "psychology", "tam ly"),
            genre("martial_arts", "võ thuật", "martial arts", "martial art", "vo thuat"),
            genre("kids", "thiếu nhi", "kids", "kid", "children", "thieu nhi"),
            genre("anime", "anime", "anime"),
            genre("disaster", "thảm họa", "disaster", "tham hoa"),
            genre("post_apocalyptic", "hậu tận thế", "post apocalyptic", "postapocalyptic", "hau tan the"),
            genre("supernatural", "siêu nhiên", "supernatural", "sieu nhien"),
            genre("film_noir", "noir (phim đen)", "film noir", "noir", "phim den")
    );

    private final MovieRepository movieRepository;
    private final ShowtimeRepository showtimeRepository;
    private final CinemaRoomRepository cinemaRoomRepository;
    private final TheaterRepository theaterRepository;
    private final S3PresignedUrlService s3PresignedUrlService;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();
    private volatile long geminiRetryAfterMillis = 0;

    @Value("${app.ai.gemini.api-key:}")
    private String geminiApiKey;

    @Value("${app.ai.gemini.model:gemini-2.0-flash}")
    private String geminiModel;

    public MovieChatResponse chat(String message) {
        return chat(message, List.of());
    }

    public MovieChatResponse chat(String message, List<MovieChatRequest.ChatTurn> history) {
        List<Movie> movies = movieRepository.findAllByActiveTrue();
        ConversationContext context = buildConversationContext(message, history);
        MessageIntent messageIntent = classifyMessage(context, movies);

        if (messageIntent != MessageIntent.MOVIE_DISCOVERY) {
            return buildConversationResponse(context, messageIntent);
        }

        if (movies.isEmpty()) {
            return MovieChatResponse.builder()
                    .answer("Hiện chưa có phim nào trong hệ thống để tư vấn.")
                    .recommendations(List.of())
                    .build();
        }

        List<ScoredMovie> ranked = rankMovies(context, movies);
        List<MovieChatResponse.MovieRecommendation> recommendations = ranked.stream()
                .limit(5)
                .map(item -> toRecommendation(item.movie(), item.reason()))
                .toList();

        String answer = buildFallbackAnswer(recommendations);
        if (hasText(geminiApiKey) && !recommendations.isEmpty() && System.currentTimeMillis() >= geminiRetryAfterMillis) {
            try {
                answer = callGemini(context, recommendations);
            } catch (Exception exception) {
                handleGeminiFailure(exception);
            }
        }

        return MovieChatResponse.builder()
                .answer(answer)
                .recommendations(recommendations)
                .build();
    }

    private MessageIntent classifyMessage(ConversationContext context, List<Movie> movies) {
        String query = context.currentQuery();
        if (!hasText(query)) return MessageIntent.GIBBERISH;
        if (containsAny(query, Set.of("lich chieu", "suat chieu", "gio chieu", "chieu luc", "chieu may gio")))
            return MessageIntent.SHOWTIMES;
        if (containsAny(query, Set.of("dat ve", "mua ve", "chon ghe", "giu ghe")))
            return MessageIntent.BOOKING_HELP;
        if (containsAny(query, Set.of("thanh toan", "payos", "vietqr", "quet qr", "loi giao dich")))
            return MessageIntent.PAYMENT_HELP;
        if (containsAny(query, Set.of("hoan tien", "hoan ve", "huy ve", "refund")))
            return MessageIntent.REFUND_HELP;
        if (containsAny(query, Set.of("chi duong", "dia chi rap", "dia chi cac rap", "rap o dau", "duong toi rap", "vi tri rap")))
            return MessageIntent.DIRECTIONS;
        if (containsAny(query, Set.of("tom tat", "noi dung phim", "spoiler")))
            return MessageIntent.SUMMARY;
        if (containsAny(query, Set.of("faq", "cau hoi thuong gap", "quy dinh thaufilm", "ho tro thaufilm")))
            return MessageIntent.FAQ;

        QueryIntent parsedIntent = parseIntent(query, movies);
        if (parsedIntent.hasCriteria() || containsAny(query, MOVIE_SIGNALS)) {
            return MessageIntent.MOVIE_DISCOVERY;
        }
        if (containsAny(query, MOVIE_FOLLOW_UP_SIGNALS)
                && (containsAny(context.previousUserQuery(), MOVIE_SIGNALS)
                || parseIntent(context.previousUserQuery(), movies).hasCriteria())) {
            return MessageIntent.MOVIE_DISCOVERY;
        }
        if (isGreeting(query)) return MessageIntent.GREETING;
        if (containsAny(query, Set.of("cam on", "thanks", "thank you", "tot qua", "hay qua"))) {
            return MessageIntent.THANKS;
        }
        if (containsAny(query, Set.of("ban la ai", "ban lam duoc gi", "chuc nang", "giup gi", "help"))) {
            return MessageIntent.CAPABILITY;
        }
        if (looksLikeGibberish(query)) return MessageIntent.GIBBERISH;
        return MessageIntent.GENERAL_CONVERSATION;
    }

    private MovieChatResponse buildConversationResponse(ConversationContext context, MessageIntent intent) {
        String answer = switch (intent) {
            case GREETING -> "Chào bạn! Mình là trợ lý phim của ThauFilm. Bạn có thể hỏi mình phim gì đang chiếu, phim theo thể loại hoặc theo thời lượng nhé.";
            case THANKS -> "Không có gì! Khi cần đổi gu hoặc tìm thêm phim, bạn cứ nói thể loại và thời lượng mong muốn nhé.";
            case CAPABILITY -> "Mình có thể tìm phim theo gu, tra lịch chiếu, hướng dẫn đặt vé, giải thích lỗi thanh toán, hướng dẫn hoàn tiền, cung cấp địa chỉ rạp, tóm tắt phim không spoiler và trả lời FAQ ThauFilm.";
            case GIBBERISH -> "Mình chưa hiểu câu này. Bạn thử viết rõ hơn, ví dụ: “Gợi ý phim hành động dưới 2 tiếng” nhé.";
            case GENERAL_CONVERSATION -> buildGeneralFallback();
            case SHOWTIMES -> buildShowtimeAnswer(context);
            case BOOKING_HELP -> buildBookingHelp();
            case PAYMENT_HELP -> buildPaymentHelp();
            case REFUND_HELP -> buildRefundHelp();
            case DIRECTIONS -> buildDirectionsAnswer(context);
            case SUMMARY -> buildSummaryAnswer(context);
            case FAQ -> buildFaqAnswer();
            case MOVIE_DISCOVERY -> throw new IllegalStateException("Movie discovery must use the recommendation flow");
        };

        if (intent == MessageIntent.GENERAL_CONVERSATION
                && hasText(geminiApiKey)
                && System.currentTimeMillis() >= geminiRetryAfterMillis) {
            try {
                answer = callGeminiConversation(context);
            } catch (Exception exception) {
                handleGeminiFailure(exception);
            }
        }

        return MovieChatResponse.builder()
                .answer(answer)
                .recommendations(List.of())
                .build();
    }

    private String buildGeneralFallback() {
        return "Mình chuyên hỗ trợ về phim và trải nghiệm tại ThauFilm. Với câu hỏi này mình chưa thể trả lời chắc chắn; bạn có thể hỏi mình gợi ý phim, thể loại, thời lượng hoặc phim đang chiếu nhé.";
    }

    private String buildShowtimeAnswer(ConversationContext context) {
        List<Movie> movies = movieRepository.findAllByActiveTrue();
        Movie requestedMovie = findReferenceMovie(context.currentQuery(), movies);
        List<Showtime> source = requestedMovie == null
                ? showtimeRepository.findUpcoming(java.time.LocalDate.now())
                : showtimeRepository.findByMovieIdOrderByStartTimeAsc(requestedMovie.getId());
        List<Showtime> upcoming = source.stream()
                .filter(item -> item.getStartTime() != null && item.getStartTime().isAfter(LocalDateTime.now()))
                .limit(8).toList();
        if (upcoming.isEmpty()) return requestedMovie == null
                ? "Hiện chưa có suất chiếu sắp tới trong hệ thống."
                : "Hiện chưa có suất chiếu sắp tới cho " + requestedMovie.getTitle() + ".";
        StringBuilder answer = new StringBuilder(requestedMovie == null
                ? "Các suất chiếu sắp tới:\n" : "Lịch chiếu của " + requestedMovie.getTitle() + ":\n");
        for (Showtime showtime : upcoming) {
            Movie movie = movieRepository.findById(showtime.getMovieId()).orElse(null);
            CinemaRoom room = showtime.getCinemaRoomId() == null ? null
                    : cinemaRoomRepository.findById(showtime.getCinemaRoomId()).orElse(null);
            Theater theater = room == null || room.getTheaterId() == null ? null
                    : theaterRepository.findById(room.getTheaterId()).orElse(null);
            answer.append("- ").append(movie == null ? "Phim" : movie.getTitle())
                    .append(" · ").append(showtime.getStartTime().format(
                            java.time.format.DateTimeFormatter.ofPattern("dd/MM HH:mm")))
                    .append(showtime.isOnline() ? " · Xem online"
                            : " · " + (theater == null ? "Rạp đang cập nhật" : theater.getName()))
                    .append('\n');
        }
        return answer.append("Bạn mở chi tiết phim để chọn ghế và đặt vé.").toString();
    }

    private String buildBookingHelp() {
        return "Cách đặt vé:\n1. Chọn phim và suất chiếu.\n2. Chọn ghế còn trống."
                + "\n3. Kiểm tra giá, mã giảm giá và combo.\n4. Thanh toán trong thời gian giữ ghế."
                + "\n5. Thành công sẽ mở trang Vé của tôi và gửi vé qua email.";
    }

    private String buildPaymentHelp() {
        return "Nếu thanh toán lỗi:\n- Kiểm tra trạng thái trong Vé của tôi trước khi trả lại."
                + "\n- Không tạo nhiều giao dịch cho cùng một booking."
                + "\n- Nếu đã trừ tiền nhưng vé chưa xác nhận, chờ PayOS cập nhật rồi dùng cập nhật thanh toán."
                + "\n- Vẫn chưa khớp: gửi mã booking và mã giao dịch cho Staff.";
    }

    private String buildRefundHelp() {
        return "Luồng hoàn tiền:\n1. Vé của tôi → Chi tiết/Hoàn tiền."
                + "\n2. Chọn thủ công hoặc tự động PayOS/Bảo Kim."
                + "\n3. Staff Trưởng xác minh.\n4. Admin duyệt rồi hệ thống mới hoàn."
                + "\nVé đã check-in, phim online đã mở xem hoặc suất chiếu đã bắt đầu không được hoàn.";
    }

    private String buildDirectionsAnswer(ConversationContext context) {
        List<Theater> theaters = theaterRepository.findByStatus(TheaterStatus.ACTIVE);
        List<Theater> matched = theaters.stream()
                .filter(theater -> matchesKnownText(context.currentQuery(), theater.getName())
                        || matchesKnownText(context.currentQuery(), theater.getAddress())
                        || matchesKnownText(context.currentQuery(), theater.getCity()))
                .toList();
        List<Theater> result = matched.isEmpty() ? theaters : matched;
        if (result.isEmpty()) return "Hiện hệ thống chưa có địa chỉ rạp đang hoạt động.";
        StringBuilder answer = new StringBuilder("Địa chỉ rạp ThauFilm:\n");
        result.stream().limit(6).forEach(theater -> answer.append("- ").append(theater.getName())
                .append(": ").append(safe(theater.getAddress()))
                .append(hasText(theater.getCity()) ? ", " + theater.getCity() : "").append('\n'));
        return answer.append("Bạn có thể sao chép địa chỉ vào Google Maps để chỉ đường.").toString();
    }

    private boolean matchesKnownText(String query, String value) {
        String normalized = normalize(value);
        return hasText(normalized) && query.contains(normalized);
    }

    private String buildSummaryAnswer(ConversationContext context) {
        Movie movie = findReferenceMovie(context.currentQuery(), movieRepository.findAllByActiveTrue());
        if (movie == null) return "Bạn muốn tóm tắt phim nào? Hãy nhập đúng tên phim trên ThauFilm.";
        if (!hasText(movie.getDescription())) return movie.getTitle() + " hiện chưa có phần tóm tắt.";
        boolean allowSpoiler = containsAny(context.currentQuery(),
                Set.of("co spoiler", "cho phep spoiler", "tiet lo", "ke het"));
        String description = movie.getDescription().trim();
        if (!allowSpoiler && description.length() > 320) {
            int sentenceEnd = description.lastIndexOf('.', 320);
            description = description.substring(0, sentenceEnd >= 120 ? sentenceEnd + 1 : 320) + "…";
        }
        return (allowSpoiler ? "Tóm tắt theo nội dung ThauFilm: " : "Tóm tắt không tiết lộ nút thắt: ")
                + description;
    }

    private String buildFaqAnswer() {
        return "FAQ ThauFilm:\n- Vé ở đâu? Tài khoản → Vé của tôi."
                + "\n- Vé được gửi thế nào? Hiển thị trong hệ thống và gửi PDF qua email."
                + "\n- Hoàn tiền thế nào? Gửi trong chi tiết vé, Staff Trưởng xác minh, Admin duyệt."
                + "\n- Không nhận email? Kiểm tra Spam và email tài khoản.";
    }

    private List<ScoredMovie> rankMovies(ConversationContext context, List<Movie> movies) {
        QueryIntent currentIntent = parseIntent(context.currentQuery(), movies);
        QueryIntent intent = currentIntent.hasCriteria()
                ? currentIntent
                : parseIntent(context.intentQuery(), movies);

        return movies.stream()
                .map(movie -> scoreMovie(movie, context.currentQuery(), intent))
                .filter(item -> item.score() > 0)
                .sorted(this::compareScoredMovies)
                .toList();
    }

    private ConversationContext buildConversationContext(String message, List<MovieChatRequest.ChatTurn> history) {
        String currentMessage = safe(message);
        List<String> recentUserMessages = new ArrayList<>();
        if (history != null) {
            history.stream()
                    .filter(turn -> turn != null && "user".equalsIgnoreCase(safe(turn.getRole())))
                    .map(MovieChatRequest.ChatTurn::getMessage)
                    .filter(this::hasText)
                    .skip(Math.max(0, history.size() - 8))
                    .forEach(recentUserMessages::add);
        }
        String previousUserQuery = normalize(String.join(" ", recentUserMessages));
        recentUserMessages.add(currentMessage);
        return new ConversationContext(
                currentMessage,
                normalize(currentMessage),
                normalize(String.join(" ", recentUserMessages)),
                previousUserQuery
        );
    }

    private int compareScoredMovies(ScoredMovie left, ScoredMovie right) {
        int byScore = Integer.compare(right.score(), left.score());
        if (byScore != 0) return byScore;
        BigDecimal leftRating = left.movie().getRating() == null ? BigDecimal.ZERO : left.movie().getRating();
        BigDecimal rightRating = right.movie().getRating() == null ? BigDecimal.ZERO : right.movie().getRating();
        return rightRating.compareTo(leftRating);
    }

    private ScoredMovie scoreMovie(Movie movie, String query, QueryIntent intent) {
        int score = intent.hasCriteria() ? 0 : 10;
        boolean matchedCriteria = !intent.hasCriteria();
        List<String> reasons = new ArrayList<>();

        if (intent.maxDurationMinutes() != null) {
            if (movie.getDurationMinutes() == null || movie.getDurationMinutes() > intent.maxDurationMinutes()) {
                return new ScoredMovie(movie, 0, "");
            }
            score += 70;
            matchedCriteria = true;
            reasons.add("dưới " + intent.maxDurationMinutes() + " phút");
        }

        if (intent.minDurationMinutes() != null) {
            if (movie.getDurationMinutes() == null || movie.getDurationMinutes() < intent.minDurationMinutes()) {
                return new ScoredMovie(movie, 0, "");
            }
            score += 55;
            matchedCriteria = true;
            reasons.add("từ " + intent.minDurationMinutes() + " phút trở lên");
        }

        if (intent.nearDurationMinutes() != null) {
            if (movie.getDurationMinutes() == null) {
                return new ScoredMovie(movie, 0, "");
            }
            int diff = Math.abs(movie.getDurationMinutes() - intent.nearDurationMinutes());
            if (diff > DURATION_TOLERANCE_MINUTES) {
                return new ScoredMovie(movie, 0, "");
            }
            score += 90 - diff * 3;
            matchedCriteria = true;
            reasons.add(diff == 0
                    ? "đúng " + intent.nearDurationMinutes() + " phút"
                    : "gần " + intent.nearDurationMinutes() + " phút");
        }

        if (intent.status() != null) {
            if (movie.getStatus() != intent.status()) {
                return new ScoredMovie(movie, 0, "");
            }
            score += 50;
            matchedCriteria = true;
            reasons.add(intent.status() == Movie.Status.NOW_SHOWING ? "đang chiếu" : "sắp chiếu");
        }

        if (intent.reference() != null) {
            if (movie.getId().equals(intent.reference().getId())) {
                score -= 20;
            }
            int genreOverlap = overlap(tokens(intent.reference().getGenre()), tokens(movie.getGenre()));
            int textOverlap = overlap(tokens(intent.reference().getDescription()), tokens(movie.getDescription()));
            score += genreOverlap * 35 + Math.min(textOverlap, 4) * 6;
            if (genreOverlap > 0 || textOverlap > 0) {
                matchedCriteria = true;
            }
            if (genreOverlap > 0) reasons.add("cùng chất " + safe(intent.reference().getTitle()));
        }

        Set<String> movieGenres = detectGenreKeys(movie.getGenre());
        for (String excludedGenre : intent.excludedGenres()) {
            if (movieGenres.contains(excludedGenre)) {
                return new ScoredMovie(movie, 0, "");
            }
        }

        boolean matchedRequestedGenre = intent.genres().isEmpty();
        for (String genre : intent.genres()) {
            if (movieGenres.contains(genre)) {
                matchedRequestedGenre = true;
                score += 65;
                matchedCriteria = true;
                reasons.add("thuộc thể loại " + genreLabel(genre));
            }
        }

        if (!matchedRequestedGenre) {
            return new ScoredMovie(movie, 0, "");
        }

        if (matchesFreeText(query, movie)) {
            score += 30;
            matchedCriteria = true;
            reasons.add("khớp nội dung bạn hỏi");
        }

        if (!matchedCriteria) {
            return new ScoredMovie(movie, 0, "");
        }

        BigDecimal rating = movie.getRating();
        if (rating != null) {
            score += rating.multiply(BigDecimal.valueOf(2)).intValue();
        }

        String reason = reasons.isEmpty() ? "phù hợp để bạn cân nhắc" : String.join(", ", new LinkedHashSet<>(reasons));
        return new ScoredMovie(movie, score, reason);
    }

    private QueryIntent parseIntent(String query, List<Movie> movies) {
        return new QueryIntent(
                extractMaxDurationMinutes(query),
                extractMinDurationMinutes(query),
                extractNearDurationMinutes(query),
                findReferenceMovie(query, movies),
                detectGenres(query),
                detectExcludedGenres(query),
                detectStatus(query)
        );
    }

    private Integer extractMaxDurationMinutes(String query) {
        Matcher matcher = MAX_DURATION_PATTERN.matcher(query);
        if (!matcher.find()) return null;
        return parseDurationMinutes(matcher.group(1), matcher.group(2));
    }

    private Integer extractMinDurationMinutes(String query) {
        Matcher matcher = MIN_DURATION_PATTERN.matcher(query);
        if (!matcher.find()) return null;
        return parseDurationMinutes(matcher.group(1), matcher.group(2));
    }

    private Integer extractNearDurationMinutes(String query) {
        if (extractMaxDurationMinutes(query) != null || extractMinDurationMinutes(query) != null) {
            return null;
        }
        Matcher matcher = NEAR_DURATION_PATTERN.matcher(query);
        if (!matcher.find()) return null;
        return parseDurationMinutes(matcher.group(1), matcher.group(2));
    }

    private Integer parseDurationMinutes(String rawValue, String unit) {
        int value = Integer.parseInt(rawValue);
        if (unit == null || unit.isBlank()) return value <= 5 ? value * 60 : value;
        String normalizedUnit = normalize(unit);
        return normalizedUnit.contains("tieng") || normalizedUnit.equals("h") || normalizedUnit.startsWith("hour")
                ? value * 60
                : value;
    }

    private Movie findReferenceMovie(String query, List<Movie> movies) {
        return movies.stream()
                .filter(movie -> query.contains(normalize(movie.getTitle())))
                .max(Comparator.comparingInt(movie -> normalize(movie.getTitle()).length()))
                .orElse(null);
    }

    private Set<String> detectGenres(String query) {
        Set<String> genres = new LinkedHashSet<>();
        for (GenreDefinition definition : SUPPORTED_GENRES) {
            if (containsGenreAlias(query, definition)) {
                genres.add(definition.key());
            }
        }
        return genres;
    }

    private Set<String> detectExcludedGenres(String query) {
        Set<String> genres = new LinkedHashSet<>();
        for (GenreDefinition definition : SUPPORTED_GENRES) {
            if (definition.aliases().stream().anyMatch(alias -> isNegated(query, alias))) {
                genres.add(definition.key());
            }
        }
        return genres;
    }

    private Set<String> detectGenreKeys(String value) {
        String normalizedValue = normalize(value);
        Set<String> genres = new LinkedHashSet<>();
        for (GenreDefinition definition : SUPPORTED_GENRES) {
            if (containsGenreAlias(normalizedValue, definition)) {
                genres.add(definition.key());
            }
        }
        return genres;
    }

    private boolean containsGenreAlias(String value, GenreDefinition definition) {
        return definition.aliases().stream().anyMatch(alias -> containsPhrase(value, alias));
    }

    private static GenreDefinition genre(String key, String label, String... aliases) {
        return new GenreDefinition(key, label, List.of(aliases));
    }

    private boolean isNegated(String query, String value) {
        return query.contains("khong " + value)
                || query.contains("ko " + value)
                || query.contains("khong thich " + value)
                || query.contains("khong thich phim " + value)
                || query.contains("khong muon " + value)
                || query.contains("khong muon xem " + value)
                || query.contains("khong muon xem phim " + value)
                || query.contains("khong xem " + value)
                || query.contains("khong xem phim " + value)
                || query.contains("tru " + value)
                || query.contains("not " + value)
                || query.contains("no " + value);
    }

    private Movie.Status detectStatus(String query) {
        if (query.contains("dang chieu") || query.contains("now showing")) {
            return Movie.Status.NOW_SHOWING;
        }
        if (query.contains("sap chieu") || query.contains("coming soon")) {
            return Movie.Status.COMING_SOON;
        }
        return null;
    }

    private boolean matchesFreeText(String query, Movie movie) {
        Set<String> queryTokens = tokens(query);
        queryTokens.removeAll(Set.of(
                "phim", "nao", "toi", "minh", "thich", "co", "khong", "giong", "duoi", "tren",
                "hon", "tieng", "phut", "the", "loai", "goi", "xem", "dang", "sap", "chieu"
        ));
        if (queryTokens.isEmpty()) return false;
        Set<String> movieTokens = tokens(String.join(" ",
                safe(movie.getTitle()), safe(movie.getGenre()), safe(movie.getDescription()),
                safe(movie.getDirector()), safe(movie.getActors())));
        return overlap(queryTokens, movieTokens) >= Math.min(2, queryTokens.size());
    }

    private String buildFallbackAnswer(List<MovieChatResponse.MovieRecommendation> recommendations) {
        if (recommendations.isEmpty()) {
            return "Mình chưa tìm thấy phim thật sự khớp. Bạn thử hỏi cụ thể hơn như \"phim dưới 2 tiếng\", \"phim hành động\", \"phim khoảng 120 phút\" hoặc \"phim đang chiếu\" nhé.";
        }
        StringBuilder builder = new StringBuilder("Mình gợi ý cho bạn:\n");
        recommendations.forEach(movie -> builder.append("- ")
                .append(movie.getTitle())
                .append(" - ")
                .append(movie.getReason())
                .append(".\n"));
        builder.append("Bạn có thể mở chi tiết phim để xem suất chiếu phù hợp.");
        return builder.toString();
    }

    private String callGemini(ConversationContext context, List<MovieChatResponse.MovieRecommendation> recommendations) throws Exception {
        ObjectNode root = objectMapper.createObjectNode();
        ObjectNode content = root.putArray("contents").addObject();
        content.putArray("parts").addObject().put("text", buildPrompt(context, recommendations));
        root.putObject("generationConfig")
                .put("temperature", 0.35)
                .put("maxOutputTokens", 350);

        HttpRequest request = HttpRequest.newBuilder(URI.create(GEMINI_ENDPOINT.formatted(geminiModel)))
                .timeout(Duration.ofSeconds(30))
                .header("x-goog-api-key", geminiApiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(root.toString()))
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IllegalStateException("Gemini returned HTTP " + response.statusCode());
        }
        String text = objectMapper.readTree(response.body()).path("candidates").path(0)
                .path("content").path("parts").path(0).path("text").asText();
        return hasText(text) ? text.trim() : buildFallbackAnswer(recommendations);
    }

    private String callGeminiConversation(ConversationContext context) throws Exception {
        String prompt = """
                Bạn là trợ lý trò chuyện của rạp phim ThauFilm.
                Trả lời câu hỏi của khách bằng tiếng Việt, thân thiện, chính xác và tối đa 4 câu.
                Nếu câu hỏi cần dữ liệu thời gian thực hoặc bạn không chắc, hãy nói rõ giới hạn thay vì bịa.
                Không tự tạo tên phim, suất chiếu, giá vé hoặc chính sách của ThauFilm.
                Nếu phù hợp, nhẹ nhàng hướng cuộc trò chuyện về nhu cầu xem phim.

                Câu hỏi của khách: "%s"
                """.formatted(context.currentMessage().replace("\"", "'"));

        ObjectNode root = objectMapper.createObjectNode();
        ObjectNode content = root.putArray("contents").addObject();
        content.putArray("parts").addObject().put("text", prompt);
        root.putObject("generationConfig")
                .put("temperature", 0.25)
                .put("maxOutputTokens", 220);

        HttpRequest request = HttpRequest.newBuilder(URI.create(GEMINI_ENDPOINT.formatted(geminiModel)))
                .timeout(Duration.ofSeconds(20))
                .header("x-goog-api-key", geminiApiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(root.toString()))
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IllegalStateException("Gemini returned HTTP " + response.statusCode());
        }
        String text = objectMapper.readTree(response.body()).path("candidates").path(0)
                .path("content").path("parts").path(0).path("text").asText();
        return hasText(text) ? text.trim() : buildGeneralFallback();
    }

    private void handleGeminiFailure(Exception exception) {
        if (exception.getMessage() != null && exception.getMessage().contains("HTTP 429")) {
            geminiRetryAfterMillis = System.currentTimeMillis() + Duration.ofMinutes(5).toMillis();
            log.info("Đã đạt hạn mức hoặc giới hạn tần suất của Gemini. Chuyển sang phản hồi cục bộ trong 5 phút.");
        } else {
            log.warn("AI của chatbot phim gặp lỗi: {}", exception.getMessage());
        }
    }

    private String buildPrompt(ConversationContext context, List<MovieChatResponse.MovieRecommendation> recommendations) {
        StringBuilder prompt = new StringBuilder("""
                Bạn là chatbot tư vấn phim cho rạp ThauFilm. Trả lời bằng tiếng Việt, thân thiện, ngắn gọn.
                Chỉ được gợi ý phim trong danh sách bên dưới, không bịa phim ngoài hệ thống.
                Câu hỏi của khách: "%s"

                Danh sách phim phù hợp:
                """.formatted(context.currentMessage().replace("\"", "'")));
        prompt.append("Ngu canh gan day: ")
                .append(context.intentQuery().replace("\"", "'"))
                .append('\n');
        recommendations.forEach(movie -> prompt.append("- ")
                .append(movie.getTitle())
                .append(" | thể loại: ").append(safe(movie.getGenre()))
                .append(" | thời lượng: ").append(movie.getDurationMinutes()).append(" phút")
                .append(" | điểm: ").append(movie.getRating())
                .append(" | lý do: ").append(movie.getReason())
                .append('\n'));
        prompt.append("Hãy trả lời dạng 1 đoạn ngắn và 3-5 bullet phim.");
        return prompt.toString();
    }

    private MovieChatResponse.MovieRecommendation toRecommendation(Movie movie, String reason) {
        return MovieChatResponse.MovieRecommendation.builder()
                .id(movie.getId())
                .title(movie.getTitle())
                .genre(movie.getGenre())
                .durationMinutes(movie.getDurationMinutes())
                .rating(movie.getRating())
                .posterUrl(s3PresignedUrlService.resolvePosterUrl(movie.getPosterUrl()))
                .status(movie.getStatus() != null ? movie.getStatus().name() : null)
                .reason(reason)
                .build();
    }

    private Set<String> tokens(String value) {
        Set<String> result = new LinkedHashSet<>();
        for (String token : normalize(value).split("\\s+")) {
            if (token.length() >= 3) result.add(token);
        }
        return result;
    }

    private int overlap(Set<String> left, Set<String> right) {
        int count = 0;
        for (String item : left) if (right.contains(item)) count++;
        return count;
    }

    private boolean containsAny(String value, Set<String> signals) {
        for (String signal : signals) {
            if (containsPhrase(value, signal)) return true;
        }
        return false;
    }

    private boolean containsPhrase(String value, String phrase) {
        return (" " + value + " ").contains(" " + phrase + " ");
    }

    private boolean isGreeting(String query) {
        return query.matches("^(xin chao|chao|hello|hi|hey)( ban| bot| chatbot| thaufilm)?$")
                || query.startsWith("chao buoi ");
    }

    private boolean looksLikeGibberish(String query) {
        if (query.length() <= 1) return true;
        String compact = query.replace(" ", "");
        if (compact.matches(".*(.)\\1{4,}.*")) return true;
        if (query.split("\\s+").length <= 2 && compact.length() >= 5) {
            long vowels = compact.chars().filter(character -> "aeiouy".indexOf(character) >= 0).count();
            return vowels == 0 || vowels * 5 < compact.length();
        }
        return false;
    }

    private String normalize(String value) {
        String normalized = Normalizer.normalize(safe(value), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return normalized.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9\\s]", " ").replaceAll("\\s+", " ").trim();
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }

    private String genreLabel(String genre) {
        return SUPPORTED_GENRES.stream()
                .filter(definition -> definition.key().equals(genre))
                .map(GenreDefinition::label)
                .findFirst()
                .orElse(genre);
    }

    private enum MessageIntent {
        MOVIE_DISCOVERY,
        SHOWTIMES,
        BOOKING_HELP,
        PAYMENT_HELP,
        REFUND_HELP,
        DIRECTIONS,
        SUMMARY,
        FAQ,
        GREETING,
        THANKS,
        CAPABILITY,
        GENERAL_CONVERSATION,
        GIBBERISH
    }

    private record ConversationContext(
            String currentMessage,
            String currentQuery,
            String intentQuery,
            String previousUserQuery
    ) {}

    private record QueryIntent(
            Integer maxDurationMinutes,
            Integer minDurationMinutes,
            Integer nearDurationMinutes,
            Movie reference,
            Set<String> genres,
            Set<String> excludedGenres,
            Movie.Status status
    ) {
        private boolean hasCriteria() {
            return maxDurationMinutes != null
                    || minDurationMinutes != null
                    || nearDurationMinutes != null
                    || reference != null
                    || !genres.isEmpty()
                    || !excludedGenres.isEmpty()
                    || status != null;
        }
    }

    private record ScoredMovie(Movie movie, int score, String reason) {}

    private record GenreDefinition(String key, String label, List<String> aliases) {}
}
