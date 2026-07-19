package com.filmticket.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.filmticket.dto.MovieChatRequest;
import com.filmticket.dto.MovieChatResponse;
import com.filmticket.entity.Movie;
import com.filmticket.repository.MovieRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class MovieChatbotServiceTest {
    private MovieRepository movieRepository;
    private MovieChatbotService service;

    @BeforeEach
    void setUp() {
        movieRepository = mock(MovieRepository.class);
        S3PresignedUrlService s3PresignedUrlService = mock(S3PresignedUrlService.class);
        when(s3PresignedUrlService.resolvePosterUrl(any())).thenAnswer(invocation -> invocation.getArgument(0));
        service = new MovieChatbotService(movieRepository, s3PresignedUrlService, new ObjectMapper());
    }

    @Test
    void nonsenseDoesNotReturnDefaultMovieList() {
        when(movieRepository.findAllByActiveTrue()).thenReturn(sampleMovies());

        MovieChatResponse response = service.chat("asdfghjkl");

        assertTrue(response.getRecommendations().isEmpty());
        assertTrue(response.getAnswer().contains("chưa hiểu"));
    }

    @Test
    void generalQuestionStaysOutOfMovieRankingWhenAiIsUnavailable() {
        when(movieRepository.findAllByActiveTrue()).thenReturn(sampleMovies());

        MovieChatResponse response = service.chat("Thời tiết hôm nay thế nào?");

        assertTrue(response.getRecommendations().isEmpty());
        assertTrue(response.getAnswer().contains("chuyên hỗ trợ về phim"));
    }

    @Test
    void movieIntentStillFiltersRecommendationsByGenre() {
        when(movieRepository.findAllByActiveTrue()).thenReturn(sampleMovies());

        MovieChatResponse response = service.chat("Gợi ý phim hành động dưới 2 tiếng");

        assertFalse(response.getRecommendations().isEmpty());
        assertEquals("Biệt đội tốc độ", response.getRecommendations().get(0).getTitle());
        assertTrue(response.getRecommendations().stream()
                .allMatch(movie -> movie.getGenre().toLowerCase().contains("action")));
    }

    @Test
    void requestedGenreCannotBeBypassedByDescriptionKeywords() {
        Movie romance = Movie.builder()
                .id(UUID.randomUUID())
                .title("Mắt Biếc")
                .genre("Romance, Drama")
                .description("Chuyện tình tuổi học trò")
                .durationMinutes(117)
                .rating(BigDecimal.valueOf(8.3))
                .status(Movie.Status.NOW_SHOWING)
                .posterUrl("romance.jpg")
                .build();
        Movie horror = Movie.builder()
                .id(UUID.randomUUID())
                .title("Vùng Đất Câm Lặng")
                .genre("Horror, Thriller")
                .description("Một gia đình bảo vệ tình cảm giữa thảm họa")
                .durationMinutes(100)
                .rating(BigDecimal.valueOf(7.0))
                .status(Movie.Status.NOW_SHOWING)
                .posterUrl("horror.jpg")
                .build();
        when(movieRepository.findAllByActiveTrue()).thenReturn(List.of(romance, horror));

        MovieChatResponse response = service.chat("phim tình cảm");

        assertEquals(1, response.getRecommendations().size());
        assertEquals("Mắt Biếc", response.getRecommendations().get(0).getTitle());
    }

    @Test
    void shortFollowUpUsesPreviousMovieConversation() {
        when(movieRepository.findAllByActiveTrue()).thenReturn(sampleMovies());
        MovieChatRequest.ChatTurn previous = new MovieChatRequest.ChatTurn();
        previous.setRole("user");
        previous.setMessage("Gợi ý phim đang chiếu");

        MovieChatResponse response = service.chat("Còn phim nào khác?", List.of(previous));

        assertFalse(response.getRecommendations().isEmpty());
    }

    private List<Movie> sampleMovies() {
        return List.of(
                Movie.builder()
                        .id(UUID.randomUUID())
                        .title("Biệt đội tốc độ")
                        .genre("Action, Adventure")
                        .description("Một đội đặc nhiệm thực hiện nhiệm vụ nguy hiểm")
                        .durationMinutes(105)
                        .rating(BigDecimal.valueOf(8.2))
                        .status(Movie.Status.NOW_SHOWING)
                        .posterUrl("action.jpg")
                        .build(),
                Movie.builder()
                        .id(UUID.randomUUID())
                        .title("Ngày vui")
                        .genre("Comedy")
                        .description("Một câu chuyện hài hước dành cho gia đình")
                        .durationMinutes(95)
                        .rating(BigDecimal.valueOf(7.4))
                        .status(Movie.Status.NOW_SHOWING)
                        .posterUrl("comedy.jpg")
                        .build()
        );
    }
}
