package com.filmticket.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.filmticket.dto.MovieChatRequest;
import com.filmticket.dto.MovieChatResponse;
import com.filmticket.entity.Movie;
import com.filmticket.entity.Theater;
import com.filmticket.model.TheaterStatus;
import com.filmticket.repository.MovieRepository;
import com.filmticket.repository.ShowtimeRepository;
import com.filmticket.repository.CinemaRoomRepository;
import com.filmticket.repository.TheaterRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class MovieChatbotServiceTest {
    private MovieRepository movieRepository;
    private ShowtimeRepository showtimeRepository;
    private TheaterRepository theaterRepository;
    private MovieChatbotService service;

    @BeforeEach
    void setUp() {
        movieRepository = mock(MovieRepository.class);
        showtimeRepository = mock(ShowtimeRepository.class);
        theaterRepository = mock(TheaterRepository.class);
        S3PresignedUrlService s3PresignedUrlService = mock(S3PresignedUrlService.class);
        when(s3PresignedUrlService.resolvePosterUrl(any())).thenAnswer(invocation -> invocation.getArgument(0));
        service = new MovieChatbotService(movieRepository, showtimeRepository,
                mock(CinemaRoomRepository.class), theaterRepository,
                s3PresignedUrlService, new ObjectMapper());
    }

    @Test
    void refundQuestionUsesControlledPolicyInsteadOfGenericAiAnswer() {
        when(movieRepository.findAllByActiveTrue()).thenReturn(sampleMovies());

        MovieChatResponse response = service.chat("Tôi muốn hoàn tiền vé thì làm sao?");

        assertTrue(response.getAnswer().contains("Staff Trưởng"));
        assertTrue(response.getAnswer().contains("Admin"));
        assertTrue(response.getAnswer().contains("tải ảnh QR nhận tiền"));
        assertTrue(response.getAnswer().contains("BIN ngân hàng"));
        assertTrue(response.getAnswer().contains("PayOS/Bảo Kim"));
        assertTrue(response.getRecommendations().isEmpty());
    }

    @Test
    void bookingHelpMatchesTheCurrentThauFilmCheckoutFlow() {
        when(movieRepository.findAllByActiveTrue()).thenReturn(sampleMovies());

        MovieChatResponse response = service.chat("Hướng dẫn đặt vé");

        assertTrue(response.getAnswer().contains("chọn combo"));
        assertTrue(response.getAnswer().contains("voucher"));
        assertTrue(response.getAnswer().contains("Thanh toán qua PayOS"));
        assertTrue(response.getAnswer().contains("Vé của tôi"));
        assertTrue(response.getRecommendations().isEmpty());
    }

    @Test
    void inappropriateMessageIsBlockedBeforeCallingRepositoriesOrAi() {
        MovieChatResponse response = service.chat("địt mẹ chatbot");

        assertEquals("Vui lòng nhắn nội dung phù hợp.", response.getAnswer());
        assertTrue(response.getRecommendations().isEmpty());
    }

    @Test
    void todayShowtimesUseExactVietnamDateInsteadOfAllUpcomingDates() {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        when(movieRepository.findAllByActiveTrue()).thenReturn(sampleMovies());
        when(showtimeRepository.findByDate(today)).thenReturn(List.of());

        MovieChatResponse response = service.chat("Lịch chiếu hôm nay");

        verify(showtimeRepository).findByDate(today);
        verify(showtimeRepository, never()).findUpcoming(any());
        assertTrue(response.getAnswer().contains("hôm nay"));
        assertTrue(response.getRecommendations().isEmpty());
    }

    @Test
    void directionsComeFromActiveTheaterData() {
        when(movieRepository.findAllByActiveTrue()).thenReturn(sampleMovies());
        when(theaterRepository.findByStatus(TheaterStatus.ACTIVE)).thenReturn(List.of(
                Theater.builder().name("ThauFilm Quận 1").address("123 Nguyễn Huệ").city("TP.HCM").build()));

        MovieChatResponse response = service.chat("Địa chỉ các rạp ThauFilm");

        assertTrue(response.getAnswer().contains("123 Nguyễn Huệ"));
        assertTrue(response.getRecommendations().isEmpty());
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
    void supportsEveryVietnameseGenreAliasAndMatchesStoredEnglishGenre() {
        List<GenreCase> genres = List.of(
                new GenreCase("Hành động", "Action"),
                new GenreCase("Phiêu lưu", "Adventure"),
                new GenreCase("Hoạt hình", "Animation"),
                new GenreCase("Tiểu sử", "Biography"),
                new GenreCase("Hài", "Comedy"),
                new GenreCase("Hình sự", "Crime"),
                new GenreCase("Tài liệu", "Documentary"),
                new GenreCase("Chính kịch", "Drama"),
                new GenreCase("Gia đình", "Family"),
                new GenreCase("Giả tưởng", "Fantasy"),
                new GenreCase("Lịch sử", "History"),
                new GenreCase("Kinh dị", "Horror"),
                new GenreCase("Âm nhạc", "Music"),
                new GenreCase("Nhạc kịch", "Musical"),
                new GenreCase("Bí ẩn", "Mystery"),
                new GenreCase("Lãng mạn", "Romance"),
                new GenreCase("Khoa học viễn tưởng", "Science Fiction"),
                new GenreCase("Thể thao", "Sport"),
                new GenreCase("Giật gân", "Thriller"),
                new GenreCase("Chiến tranh", "War"),
                new GenreCase("Viễn Tây", "Western"),
                new GenreCase("Siêu anh hùng", "Superhero"),
                new GenreCase("Tâm lý", "Psychological"),
                new GenreCase("Võ thuật", "Martial Arts"),
                new GenreCase("Thiếu nhi", "Kids"),
                new GenreCase("Anime", "Anime"),
                new GenreCase("Thảm họa", "Disaster"),
                new GenreCase("Hậu tận thế", "Post-apocalyptic"),
                new GenreCase("Siêu nhiên", "Supernatural"),
                new GenreCase("Noir (Phim đen)", "Film Noir")
        );
        List<Movie> movies = genres.stream()
                .map(genre -> Movie.builder()
                        .id(UUID.randomUUID())
                        .title("Phim " + genre.english())
                        .genre(genre.english())
                        .description("Phim kiểm thử thể loại " + genre.english())
                        .durationMinutes(100)
                        .rating(BigDecimal.valueOf(8.0))
                        .status(Movie.Status.NOW_SHOWING)
                        .posterUrl("poster.jpg")
                        .build())
                .toList();
        when(movieRepository.findAllByActiveTrue()).thenReturn(movies);

        for (GenreCase genre : genres) {
            MovieChatResponse vietnameseResponse = service.chat("Gợi ý phim " + genre.vietnamese());
            MovieChatResponse englishResponse = service.chat("Recommend a " + genre.english() + " movie");

            assertEquals(1, vietnameseResponse.getRecommendations().size(), genre.vietnamese());
            assertEquals("Phim " + genre.english(), vietnameseResponse.getRecommendations().get(0).getTitle(), genre.vietnamese());
            assertEquals(1, englishResponse.getRecommendations().size(), genre.english());
            assertEquals("Phim " + genre.english(), englishResponse.getRecommendations().get(0).getTitle(), genre.english());
        }
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

    private record GenreCase(String vietnamese, String english) {}
}
