package com.filmticket.service;

import com.filmticket.dto.MovieResponse;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class MovieEventService {

    private static final long SSE_TIMEOUT_MS = 0L;

    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    public SseEmitter subscribe() {
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MS);
        emitters.add(emitter);

        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> emitters.remove(emitter));
        emitter.onError(error -> emitters.remove(emitter));

        sendEvent(emitter, MovieEventPayload.builder()
                .eventType("CONNECTED")
                .movieId(null)
                .movie(null)
                .timestamp(Instant.now())
                .build());

        return emitter;
    }

    public void publishMovieCreated(MovieResponse movie) {
        broadcast("MOVIE_CREATED", movie.getId(), movie);
    }

    public void publishMovieUpdated(MovieResponse movie) {
        broadcast("MOVIE_UPDATED", movie.getId(), movie);
    }

    public void publishMovieDeleted(UUID movieId) {
        broadcast("MOVIE_DELETED", movieId, null);
    }

    private void broadcast(String eventType, UUID movieId, MovieResponse movie) {
        MovieEventPayload payload = MovieEventPayload.builder()
                .eventType(eventType)
                .movieId(movieId)
                .movie(movie)
                .timestamp(Instant.now())
                .build();

        emitters.forEach(emitter -> sendEvent(emitter, payload));
    }

    private void sendEvent(SseEmitter emitter, MovieEventPayload payload) {
        try {
            emitter.send(SseEmitter.event()
                    .name(payload.getEventType())
                    .data(payload));
        } catch (IOException exception) {
            emitter.complete();
            emitters.remove(emitter);
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MovieEventPayload {
        private String eventType;
        private UUID movieId;
        private MovieResponse movie;
        private Instant timestamp;
    }
}
