package com.filmticket.service;

import com.filmticket.entity.*;
import com.filmticket.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MemberIntelligenceService {
    private final BookingRepository bookingRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final ShowtimeRepository showtimeRepository;
    private final MovieRepository movieRepository;
    private final UserRepository userRepository;

    public List<Map<String, Object>> leaderboard() {
        LocalDateTime start = LocalDate.now().withDayOfMonth(1).atStartOfDay();
        Map<UUID, Showtime> showtimes = showtimeRepository.findAll().stream().collect(Collectors.toMap(Showtime::getId, Function.identity()));
        Map<UUID, FanStats> stats = new HashMap<>();
        Set<UUID> eligibleBookings = new HashSet<>();
        bookingRepository.findAll().stream().filter(booking -> booking.getStatus() == BookingStatus.CONFIRMED)
                .filter(booking -> bookingTime(booking).isAfter(start) || bookingTime(booking).isEqual(start))
                .forEach(booking -> {
                    eligibleBookings.add(booking.getId());
                    Showtime showtime = showtimes.get(booking.getShowtimeId());
                    FanStats fan = stats.computeIfAbsent(booking.getUserId(), ignored -> new FanStats());
                    fan.bookings++;
                    if (showtime != null) fan.movies.add(showtime.getMovieId());
                });
        bookingSeatRepository.findAll().stream().filter(item -> eligibleBookings.contains(item.getBookingId())).forEach(item -> {
            Booking booking = bookingRepository.findById(item.getBookingId()).orElse(null);
            if (booking != null) stats.computeIfAbsent(booking.getUserId(), ignored -> new FanStats()).tickets++;
        });
        Map<UUID, User> users = userRepository.findAll().stream().collect(Collectors.toMap(User::getId, Function.identity()));
        List<Map.Entry<UUID, FanStats>> ranked = stats.entrySet().stream()
                .sorted((a,b) -> Integer.compare(b.getValue().score(), a.getValue().score())).limit(20).toList();
        List<Map<String,Object>> result = new ArrayList<>();
        for (int i=0;i<ranked.size();i++) {
            var entry = ranked.get(i); User user = users.get(entry.getKey()); FanStats fan = entry.getValue();
            result.add(map("rank", i+1, "userId", entry.getKey(), "name", user == null ? "Movie Fan" : displayName(user),
                    "avatarUrl", user == null ? null : user.getAvatarUrl(), "movies", fan.movies.size(), "tickets", fan.tickets, "score", fan.score()));
        }
        return result;
    }

    public Map<String,Object> achievements(UUID userId) {
        Map<UUID, Showtime> showtimes = showtimeRepository.findAll().stream().collect(Collectors.toMap(Showtime::getId, Function.identity()));
        Map<UUID, Movie> movies = movieRepository.findAll().stream().collect(Collectors.toMap(Movie::getId, Function.identity()));
        List<Booking> bookings = bookingRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .filter(booking -> booking.getStatus() == BookingStatus.CONFIRMED)
                .filter(booking -> {
                    Showtime showtime = showtimes.get(booking.getShowtimeId());
                    return showtime != null && showtime.getEndTime().isBefore(LocalDateTime.now());
                }).toList();
        Set<UUID> bookingIds = bookings.stream().map(Booking::getId).collect(Collectors.toSet());
        long tickets = bookingSeatRepository.findAll().stream().filter(item -> bookingIds.contains(item.getBookingId())).count();
        Set<UUID> uniqueMovies = bookings.stream().map(booking -> showtimes.get(booking.getShowtimeId())).filter(Objects::nonNull)
                .map(Showtime::getMovieId).collect(Collectors.toSet());
        long anime = uniqueMovies.stream().map(movies::get).filter(Objects::nonNull).filter(movie -> contains(movie.getGenre(), "anime") || contains(movie.getGenre(), "animation")).count();
        long marvel = uniqueMovies.stream().map(movies::get).filter(Objects::nonNull).filter(movie -> contains(movie.getGenre(), "marvel") || contains(movie.getDescription(), "marvel")).count();
        long weekend = bookings.stream().map(booking -> showtimes.get(booking.getShowtimeId())).filter(Objects::nonNull)
                .filter(showtime -> showtime.getStartTime().getDayOfWeek() == DayOfWeek.SATURDAY || showtime.getStartTime().getDayOfWeek() == DayOfWeek.SUNDAY).count();
        List<Map<String,Object>> items = List.of(
                achievement("FIRST_TICKET", "First Premiere", "Đặt vé xem phim đầu tiên", tickets, 1, 50),
                achievement("CINE_FAN", "Cine Fan", "Xem 5 phim khác nhau", uniqueMovies.size(), 5, 100),
                achievement("MARVEL_HUNTER", "Marvel Hunter", "Xem 10 phim Marvel", marvel, 10, 250),
                achievement("ANIME_MASTER", "Anime Master", "Xem 20 phim Anime", anime, 20, 300),
                achievement("WEEKEND_WARRIOR", "Weekend Warrior", "Xem phim 10 lần vào cuối tuần", weekend, 10, 200));
        int points = items.stream().filter(item -> (Boolean)item.get("unlocked")).mapToInt(item -> (Integer)item.get("points")).sum();
        return map("level", points / 100 + 1, "levelName", points >= 1000 ? "Legend" : points >= 500 ? "Cine Master" : "Cine Fan",
                "points", points, "uniqueMovies", uniqueMovies.size(), "tickets", tickets, "achievements", items);
    }

    public Map<String,Object> dating(DatingRequest request) {
        Set<String> aLikes = normalize(request.yourLikes()); Set<String> bLikes = normalize(request.partnerLikes());
        Set<String> dislikes = new HashSet<>(normalize(request.yourDislikes())); dislikes.addAll(normalize(request.partnerDislikes()));
        Set<String> union = new HashSet<>(aLikes); union.addAll(bLikes);
        Set<String> common = new HashSet<>(aLikes); common.retainAll(bLikes);
        int sharedScore = union.isEmpty() ? 50 : (int)Math.round(common.size() * 70.0 / union.size());
        Set<String> conflicts = new HashSet<>(aLikes); conflicts.retainAll(normalize(request.partnerDislikes()));
        Set<String> reverseConflicts = new HashSet<>(bLikes); reverseConflicts.retainAll(normalize(request.yourDislikes())); conflicts.addAll(reverseConflicts);
        int compatibility = Math.max(0, Math.min(100, sharedScore + 30 - conflicts.size() * 15));
        List<Map<String,Object>> recommendations = movieRepository.findAll().stream().filter(Movie::isActive)
                .filter(movie -> movie.getStatus() == Movie.Status.NOW_SHOWING)
                .map(movie -> new AbstractMap.SimpleEntry<>(movie, matchScore(movie, union, common, dislikes)))
                .filter(entry -> entry.getValue() >= 0).sorted(Map.Entry.<Movie,Integer>comparingByValue().reversed())
                .limit(5).map(entry -> map("movieId", entry.getKey().getId(), "title", entry.getKey().getTitle(), "genre", entry.getKey().getGenre(),
                        "posterUrl", entry.getKey().getPosterUrl(), "matchPercent", Math.min(98, 60 + entry.getValue() * 10))).toList();
        return map("compatibilityPercent", compatibility, "commonGenres", common, "conflicts", conflicts, "recommendations", recommendations);
    }

    private int matchScore(Movie movie, Set<String> likes, Set<String> common, Set<String> dislikes) {
        Set<String> genres = splitGenres(movie.getGenre());
        if (genres.stream().anyMatch(dislikes::contains)) return -1;
        int score = 0; for (String genre : genres) { if (likes.contains(genre)) score++; if (common.contains(genre)) score += 2; }
        return likes.isEmpty() ? 1 : score;
    }
    private Map<String,Object> achievement(String code,String name,String description,long progress,long target,int points) { return map("code",code,"name",name,"description",description,"progress",Math.min(progress,target),"target",target,"unlocked",progress>=target,"points",points); }
    private LocalDateTime bookingTime(Booking booking) { return booking.getConfirmedAt() != null ? booking.getConfirmedAt() : booking.getCreatedAt(); }
    private String displayName(User user) { return user.getFullName() == null || user.getFullName().isBlank() ? user.getEmail() : user.getFullName(); }
    private boolean contains(String value,String token) { return value != null && value.toLowerCase().contains(token); }
    private Set<String> normalize(List<String> values) { return values == null ? new HashSet<>() : values.stream().map(String::trim).map(String::toLowerCase).filter(v -> !v.isBlank()).collect(Collectors.toSet()); }
    private Set<String> splitGenres(String value) { return value == null ? Set.of() : Arrays.stream(value.split("[,/]")).map(String::trim).map(String::toLowerCase).collect(Collectors.toSet()); }
    private Map<String,Object> map(Object... values) { Map<String,Object> result=new LinkedHashMap<>(); for(int i=0;i<values.length;i+=2) result.put((String)values[i],values[i+1]); return result; }
    private static class FanStats { int bookings; int tickets; Set<UUID> movies=new HashSet<>(); int score(){ return movies.size()*100+tickets*10+bookings*5; } }
    public record DatingRequest(List<String> yourLikes,List<String> yourDislikes,List<String> partnerLikes,List<String> partnerDislikes) {}
}
