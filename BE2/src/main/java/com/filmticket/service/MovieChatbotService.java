package com.filmticket.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.filmticket.dto.MovieChatResponse;
import com.filmticket.entity.Movie;
import com.filmticket.repository.MovieRepository;
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
    private static final Pattern DURATION_PATTERN = Pattern.compile(
            "(?:duoi|dưới|under|less than|khong qua|không quá|<=?)\\s*(\\d{1,3})\\s*(tieng|tiếng|h|hour|hours|phut|phút|min|minutes)?",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );

    private final MovieRepository movieRepository;
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
        List<Movie> movies = movieRepository.findAllByActiveTrue();
        if (movies.isEmpty()) {
            return MovieChatResponse.builder()
                    .answer("Hiện chưa có phim nào trong hệ thống để tư vấn.")
                    .recommendations(List.of())
                    .build();
        }

        List<ScoredMovie> ranked = rankMovies(message, movies);
        List<MovieChatResponse.MovieRecommendation> recommendations = ranked.stream()
                .limit(5)
                .map(item -> toRecommendation(item.movie(), item.reason()))
                .toList();

        String answer = buildFallbackAnswer(message, recommendations);
        if (hasText(geminiApiKey) && !recommendations.isEmpty() && System.currentTimeMillis() >= geminiRetryAfterMillis) {
            try {
                answer = callGemini(message, recommendations);
            } catch (Exception exception) {
                if (exception.getMessage() != null && exception.getMessage().contains("HTTP 429")) {
                    geminiRetryAfterMillis = System.currentTimeMillis() + Duration.ofMinutes(5).toMillis();
                    log.info("Gemini quota/rate limit reached. Falling back to local recommendations for 5 minutes.");
                } else {
                    log.warn("Movie chatbot AI failed: {}", exception.getMessage());
                }
            }
        }

        return MovieChatResponse.builder()
                .answer(answer)
                .recommendations(recommendations)
                .build();
    }

    private List<ScoredMovie> rankMovies(String message, List<Movie> movies) {
        String query = normalize(message);
        Integer maxDuration = extractMaxDurationMinutes(query);
        Movie reference = findReferenceMovie(query, movies);
        Set<String> requestedGenres = detectGenres(query);

        return movies.stream()
                .map(movie -> scoreMovie(movie, query, maxDuration, reference, requestedGenres))
                .filter(item -> item.score() > 0)
                .sorted(this::compareScoredMovies)
                .toList();
    }

    private int compareScoredMovies(ScoredMovie left, ScoredMovie right) {
        int byScore = Integer.compare(right.score(), left.score());
        if (byScore != 0) return byScore;
        BigDecimal leftRating = left.movie().getRating() == null ? BigDecimal.ZERO : left.movie().getRating();
        BigDecimal rightRating = right.movie().getRating() == null ? BigDecimal.ZERO : right.movie().getRating();
        return rightRating.compareTo(leftRating);
    }

    private ScoredMovie scoreMovie(Movie movie, String query, Integer maxDuration, Movie reference, Set<String> requestedGenres) {
        int score = 1;
        List<String> reasons = new ArrayList<>();

        if (maxDuration != null) {
            if (movie.getDurationMinutes() == null || movie.getDurationMinutes() > maxDuration) {
                return new ScoredMovie(movie, 0, "");
            }
            score += 60;
            reasons.add("dưới " + maxDuration + " phút");
        }

        if (reference != null) {
            if (movie.getId().equals(reference.getId())) {
                score -= 20;
            }
            int genreOverlap = overlap(tokens(reference.getGenre()), tokens(movie.getGenre()));
            int textOverlap = overlap(tokens(reference.getDescription()), tokens(movie.getDescription()));
            score += genreOverlap * 35 + Math.min(textOverlap, 4) * 6;
            if (genreOverlap > 0) reasons.add("cùng chất " + safe(reference.getTitle()));
        }

        Set<String> movieGenres = tokens(movie.getGenre());
        for (String genre : requestedGenres) {
            if (movieGenres.contains(genre)) {
                score += 40;
                reasons.add("hợp gu " + genre);
            }
        }

        if (matchesFreeText(query, movie)) {
            score += 25;
            reasons.add("khớp nội dung bạn hỏi");
        }

        BigDecimal rating = movie.getRating();
        if (rating != null) {
            score += rating.multiply(BigDecimal.valueOf(2)).intValue();
        }

        String reason = reasons.isEmpty() ? "phù hợp để bạn cân nhắc" : String.join(", ", new LinkedHashSet<>(reasons));
        return new ScoredMovie(movie, score, reason);
    }

    private Integer extractMaxDurationMinutes(String query) {
        Matcher matcher = DURATION_PATTERN.matcher(query);
        if (!matcher.find()) return null;
        int value = Integer.parseInt(matcher.group(1));
        String unit = matcher.group(2);
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
        addIfContains(genres, query, "hanh", "action", "hanh dong");
        addIfContains(genres, query, "fiction", "sci fi", "science fiction", "vien tuong", "khoa hoc");
        addIfContains(genres, query, "romance", "tinh cam", "lang man");
        addIfContains(genres, query, "comedy", "hai");
        addIfContains(genres, query, "horror", "kinh di");
        addIfContains(genres, query, "drama", "tam ly");
        addIfContains(genres, query, "animation", "hoat hinh");
        addIfContains(genres, query, "adventure", "phieu luu");
        return genres;
    }

    private void addIfContains(Set<String> genres, String query, String canonical, String... aliases) {
        if (query.contains(canonical)) {
            genres.add(canonical);
            return;
        }
        for (String alias : aliases) {
            if (query.contains(alias)) {
                genres.add(canonical);
                return;
            }
        }
    }

    private boolean matchesFreeText(String query, Movie movie) {
        Set<String> queryTokens = tokens(query);
        queryTokens.removeAll(Set.of("phim", "nao", "toi", "thich", "co", "khong", "giong", "duoi", "tieng"));
        if (queryTokens.isEmpty()) return false;
        Set<String> movieTokens = tokens(String.join(" ",
                safe(movie.getTitle()), safe(movie.getGenre()), safe(movie.getDescription()),
                safe(movie.getDirector()), safe(movie.getActors())));
        return overlap(queryTokens, movieTokens) >= Math.min(2, queryTokens.size());
    }

    private String buildFallbackAnswer(String message, List<MovieChatResponse.MovieRecommendation> recommendations) {
        if (recommendations.isEmpty()) {
            return "Mình chưa tìm thấy phim thật sự khớp. Bạn thử hỏi cụ thể hơn như \"phim dưới 2 tiếng\", \"phim hành động\", hoặc \"giống Interstellar\" nhé.";
        }
        StringBuilder builder = new StringBuilder("Mình gợi ý cho bạn:\n");
        recommendations.forEach(movie -> builder.append("- ")
                .append(movie.getTitle())
                .append(" — ")
                .append(movie.getReason())
                .append(".\n"));
        builder.append("Bạn có thể mở chi tiết phim để xem suất chiếu phù hợp.");
        return builder.toString();
    }

    private String callGemini(String message, List<MovieChatResponse.MovieRecommendation> recommendations) throws Exception {
        ObjectNode root = objectMapper.createObjectNode();
        ObjectNode content = root.putArray("contents").addObject();
        content.putArray("parts").addObject().put("text", buildPrompt(message, recommendations));
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
        return hasText(text) ? text.trim() : buildFallbackAnswer(message, recommendations);
    }

    private String buildPrompt(String message, List<MovieChatResponse.MovieRecommendation> recommendations) {
        StringBuilder prompt = new StringBuilder("""
                Bạn là chatbot tư vấn phim cho rạp ThauFilm. Trả lời bằng tiếng Việt, thân thiện, ngắn gọn.
                Chỉ được gợi ý phim trong danh sách bên dưới, không bịa phim ngoài hệ thống.
                Câu hỏi của khách: "%s"

                Danh sách phim phù hợp:
                """.formatted(message.replace("\"", "'")));
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
                .posterUrl(movie.getPosterUrl())
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

    private record ScoredMovie(Movie movie, int score, String reason) {}
}
