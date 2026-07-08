package com.filmticket.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.filmticket.dto.ReviewResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiReviewSummaryService {
    private static final int MAX_REVIEWS = 1_000;
    private static final int MAX_REVIEW_LENGTH = 400;
    private static final String GEMINI_ENDPOINT =
            "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent";

    private final ReviewService reviewService;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10)).build();

    @Value("${app.ai.gemini.api-key:}") private String geminiApiKey;
    @Value("${app.ai.gemini.model:gemini-2.0-flash}") private String geminiModel;
    @Value("${app.ai.openai.api-key:}") private String openAiApiKey;
    @Value("${app.ai.openai.model:gpt-4.1-mini}") private String openAiModel;
    @Value("${app.ai.openai.base-url:https://api.openai.com/v1}") private String openAiBaseUrl;

    public ReviewResponse.Summary getAiReviewSummary(UUID movieId) {
        ReviewResponse.Summary summary = reviewService.getReviewSummary(movieId);
        List<String> reviews = reviewService.getAllReviewContents(movieId);
        if (reviews.isEmpty()) {
            summary.setAiSummary("Chưa có đánh giá nào để phân tích.");
            return summary;
        }

        String prompt = buildPrompt(summary, reviews);
        try {
            String result;
            if (hasText(geminiApiKey)) result = callGemini(prompt);
            else if (hasText(openAiApiKey)) result = callOpenAi(prompt);
            else {
                summary.setAiSummary(buildStatisticalFallback(summary));
                return summary;
            }
            summary.setAiSummary(stripMarkdownFence(result));
        } catch (Exception exception) {
            log.warn("AI summary failed for movie {}: {}", movieId, exception.getMessage());
            summary.setAiSummary(buildStatisticalFallback(summary));
        }
        return summary;
    }

    private String callGemini(String prompt) throws Exception {
        ObjectNode root = objectMapper.createObjectNode();
        ObjectNode content = root.putArray("contents").addObject();
        content.putArray("parts").addObject().put("text", prompt);
        root.putObject("generationConfig").put("temperature", 0.2)
                .put("responseMimeType", "application/json");
        HttpRequest request = HttpRequest.newBuilder(URI.create(GEMINI_ENDPOINT.formatted(geminiModel)))
                .timeout(Duration.ofSeconds(45))
                .header("x-goog-api-key", geminiApiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(root.toString())).build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        ensureSuccess("Gemini", response);
        String text = objectMapper.readTree(response.body()).path("candidates").path(0)
                .path("content").path("parts").path(0).path("text").asText();
        if (!hasText(text)) throw new IllegalStateException("Gemini returned an empty response");
        return text;
    }

    private String callOpenAi(String prompt) throws Exception {
        ObjectNode root = objectMapper.createObjectNode();
        root.put("model", openAiModel).put("input", prompt).put("temperature", 0.2);
        HttpRequest request = HttpRequest.newBuilder(URI.create(openAiBaseUrl + "/responses"))
                .timeout(Duration.ofSeconds(45))
                .header("Authorization", "Bearer " + openAiApiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(root.toString())).build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        ensureSuccess("OpenAI", response);
        String text = objectMapper.readTree(response.body()).path("output").path(0)
                .path("content").path(0).path("text").asText();
        if (!hasText(text)) throw new IllegalStateException("OpenAI returned an empty response");
        return text;
    }

    private void ensureSuccess(String provider, HttpResponse<String> response) {
        if (response.statusCode() < 200 || response.statusCode() >= 300)
            throw new IllegalStateException(provider + " returned HTTP " + response.statusCode());
    }

    private String buildPrompt(ReviewResponse.Summary summary, List<String> reviews) {
        StringBuilder input = new StringBuilder("""
                Tóm tắt phản hồi phim bằng tiếng Việt. Chỉ trả JSON hợp lệ theo mẫu:
                {"positivePercentage":80,"negativePercentage":20,"positives":["..."],"negatives":["..."],"overall":"..."}
                Mỗi danh sách tối đa 3 ý, overall tối đa 50 từ. Không tạo dữ kiện.
                Thống kê: %d đánh giá, điểm trung bình %.1f/5, %.0f%% tích cực.
                Đánh giá khán giả:
                """.formatted(summary.getTotalReviews(), summary.getAverageRating(), summary.getPositivePercentage()));
        reviews.stream().limit(MAX_REVIEWS).forEach(review -> {
            String normalized = review.replaceAll("[\\r\\n]+", " ").trim();
            input.append("- ").append(normalized, 0, Math.min(normalized.length(), MAX_REVIEW_LENGTH)).append('\n');
        });
        return input.toString();
    }

    private String buildStatisticalFallback(ReviewResponse.Summary summary) {
        long positive = Math.round(summary.getPositivePercentage());
        long negative = Math.max(0, 100 - positive);
        return "{\"positivePercentage\":" + positive + ",\"negativePercentage\":" + negative
                + ",\"positives\":[],\"negatives\":[],\"overall\":\"" + positive
                + "% khán giả đánh giá tích cực; " + negative + "% đánh giá dưới 4 sao.\"}";
    }

    private String stripMarkdownFence(String value) {
        return value.replace("```json", "").replace("```", "").trim();
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
