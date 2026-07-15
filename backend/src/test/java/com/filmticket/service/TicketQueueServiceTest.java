package com.filmticket.service;

import com.filmticket.dto.TicketQueueStatusResponse;
import com.filmticket.entity.Showtime;
import com.filmticket.entity.User;
import com.filmticket.repository.CinemaRoomRepository;
import com.filmticket.repository.MovieRepository;
import com.filmticket.repository.SeatAvailabilityRepository;
import com.filmticket.repository.ShowtimeRepository;
import com.filmticket.repository.UserRepository;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class TicketQueueServiceTest {

    @Test
    void admitsEachCustomerAfterTheirOneMinuteSlotWithoutWaitingForPreviousCustomerToLeave() {
        UUID showtimeId = UUID.randomUUID();
        UUID firstUserId = UUID.randomUUID();
        UUID secondUserId = UUID.randomUUID();
        Instant startedAt = Instant.parse("2026-07-15T01:00:00Z");

        ShowtimeRepository showtimeRepository = mock(ShowtimeRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        Showtime showtime = mock(Showtime.class);
        User firstUser = user(firstUserId, "Người thứ nhất");
        User secondUser = user(secondUserId, "Người thứ hai");

        when(showtimeRepository.findById(showtimeId)).thenReturn(Optional.of(showtime));
        when(showtime.isMystery()).thenReturn(true);
        when(userRepository.findById(firstUserId)).thenReturn(Optional.of(firstUser));
        when(userRepository.findById(secondUserId)).thenReturn(Optional.of(secondUser));

        TestTicketQueueService service = new TestTicketQueueService(
                showtimeRepository,
                userRepository,
                mock(MovieRepository.class),
                mock(CinemaRoomRepository.class),
                mock(SeatAvailabilityRepository.class),
                mock(DemandPredictionService.class),
                startedAt
        );

        TicketQueueStatusResponse first = service.join(showtimeId, firstUserId);
        TicketQueueStatusResponse second = service.join(showtimeId, secondUserId);

        assertTrue(first.isAdmitted());
        assertFalse(second.isAdmitted());
        assertEquals(60, second.getEstimatedWaitSeconds());

        service.setCurrentTime(startedAt.plusSeconds(59));
        assertFalse(service.status(showtimeId, secondUserId).isAdmitted());

        service.setCurrentTime(startedAt.plusSeconds(60));
        TicketQueueStatusResponse admittedSecond = service.status(showtimeId, secondUserId);
        assertTrue(admittedSecond.isAdmitted());
        assertEquals(0, admittedSecond.getEstimatedWaitSeconds());
        assertTrue(admittedSecond.getEntries().stream()
                .filter(entry -> entry.getUserId().equals(firstUserId))
                .findFirst()
                .orElseThrow()
                .isAdmitted());
    }

    private User user(UUID id, String name) {
        User user = mock(User.class);
        when(user.getId()).thenReturn(id);
        when(user.getFullName()).thenReturn(name);
        when(user.getEmail()).thenReturn(id + "@example.com");
        return user;
    }

    private static class TestTicketQueueService extends TicketQueueService {
        private Instant currentTime;

        private TestTicketQueueService(
                ShowtimeRepository showtimeRepository,
                UserRepository userRepository,
                MovieRepository movieRepository,
                CinemaRoomRepository cinemaRoomRepository,
                SeatAvailabilityRepository seatAvailabilityRepository,
                DemandPredictionService demandPredictionService,
                Instant currentTime
        ) {
            super(
                    showtimeRepository,
                    userRepository,
                    movieRepository,
                    cinemaRoomRepository,
                    seatAvailabilityRepository,
                    demandPredictionService
            );
            this.currentTime = currentTime;
        }

        @Override
        protected Instant now() {
            return currentTime;
        }

        private void setCurrentTime(Instant currentTime) {
            this.currentTime = currentTime;
        }
    }
}
