package com.filmticket.service;

import com.filmticket.dto.MovieMatchingDto;
import com.filmticket.entity.*;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.*;
import com.filmticket.websocket.RealtimeEventService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MovieMatchInteractionService {
    private final MovieMatchRepository matchRepository;
    private final MovieMatchMessageRepository messageRepository;
    private final MovieMatchInvitationRepository invitationRepository;
    private final MovieMatchingBlockRepository blockRepository;
    private final MovieMatchingReportRepository reportRepository;
    private final MovieMatchingActionRepository actionRepository;
    private final UserRepository userRepository;
    private final ShowtimeRepository showtimeRepository;
    private final MovieRepository movieRepository;
    private final CinemaRoomRepository roomRepository;
    private final TheaterRepository theaterRepository;
    private final RealtimeEventService realtimeEventService;
    private final GroupBookingService groupBookingService;

    @Transactional(readOnly = true)
    public List<MovieMatchingDto.MessageResponse> messages(UUID userId, UUID matchId) {
        MovieMatch match = requireActiveMember(matchId, userId);
        Set<UUID> userIds = Set.of(match.getUserOneId(), match.getUserTwoId());
        Map<UUID, User> users = userRepository.findAllById(userIds).stream().collect(Collectors.toMap(User::getId, Function.identity()));
        return messageRepository.findByMatchIdOrderByCreatedAtAsc(matchId).stream()
                .map(message -> toMessage(message, users.get(message.getSenderId()))).toList();
    }

    @Transactional(readOnly = true)
    public void authorizeMatchRoom(UUID userId, UUID matchId) {
        requireActiveMember(matchId, userId);
    }

    @Transactional
    public MovieMatchingDto.MessageResponse sendMessage(UUID userId, UUID matchId, String rawContent) {
        MovieMatch match = requireActiveMember(matchId, userId);
        String content = rawContent == null ? "" : rawContent.trim();
        if (content.isBlank()) throw new BadRequestException("Tin nhắn không được để trống");
        MovieMatchMessage saved = messageRepository.save(MovieMatchMessage.builder()
                .matchId(matchId).senderId(userId).content(content).build());
        User sender = requireUser(userId);
        UUID recipient = other(match, userId);
        MovieMatchingDto.MessageResponse response = toMessage(saved, sender);
        realtimeEventService.sendMatchEvent(matchId, "MATCH_MESSAGE", Map.of("matchId", matchId, "message", response));
        realtimeEventService.notifyUser(recipient, "MATCH_MESSAGE", displayName(sender), content, "/intelligence");
        return response;
    }

    @Transactional(readOnly = true)
    public List<MovieMatchingDto.InvitationResponse> invitations(UUID userId, UUID matchId) {
        requireActiveMember(matchId, userId);
        return invitationRepository.findByMatchIdOrderByCreatedAtDesc(matchId).stream().map(this::toInvitation).toList();
    }

    @Transactional
    public MovieMatchingDto.InvitationResponse invite(UUID userId, UUID matchId, UUID showtimeId) {
        MovieMatch match = matchRepository.findLockedById(matchId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy match"));
        if (!match.getUserOneId().equals(userId) && !match.getUserTwoId().equals(userId)) {
            throw new BadRequestException("Bạn không thuộc match này");
        }
        if (match.getStatus() != MovieMatch.Status.ACTIVE) throw new BadRequestException("Match này không còn hoạt động");
        Showtime showtime = showtimeRepository.findById(showtimeId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy suất chiếu"));
        if (!showtime.getStartTime().isAfter(LocalDateTime.now())) throw new BadRequestException("Suất chiếu đã bắt đầu hoặc đã kết thúc");
        List<MovieMatchInvitation> existing = invitationRepository
                .findByMatchIdAndShowtimeIdAndStatusInOrderByCreatedAtDesc(matchId, showtimeId,
                        List.of(MovieMatchInvitation.Status.PENDING, MovieMatchInvitation.Status.ACCEPTED));
        if (!existing.isEmpty()) {
            MovieMatchInvitation reusable = existing.stream()
                    .filter(item -> item.getStatus() == MovieMatchInvitation.Status.ACCEPTED)
                    .findFirst()
                    .orElse(existing.get(0));
            return toInvitation(reusable);
        }
        UUID recipient = other(match, userId);
        MovieMatchInvitation saved = invitationRepository.save(MovieMatchInvitation.builder()
                .matchId(matchId).senderId(userId).recipientId(recipient).showtimeId(showtimeId).build());
        String movieTitle = movieRepository.findById(showtime.getMovieId()).map(Movie::getTitle).orElse("Phim");
        realtimeEventService.sendUserEvent(recipient, "MATCH_INVITATION", Map.of("matchId", matchId, "invitationId", saved.getId()));
        realtimeEventService.sendMatchEvent(matchId, "MATCH_INVITATION", Map.of(
                "matchId", matchId, "invitation", toInvitation(saved)));
        realtimeEventService.notifyUser(recipient, "MATCH_INVITATION", "Lời mời xem phim",
                displayName(requireUser(userId)) + " mời bạn xem " + movieTitle, "/intelligence");
        return toInvitation(saved);
    }

    @Transactional
    public MovieMatchingDto.InvitationResponse respond(UUID userId, UUID invitationId, MovieMatchingDto.InvitationDecision decision) {
        MovieMatchInvitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy lời mời"));
        MovieMatch match = requireActiveMember(invitation.getMatchId(), userId);
        if (!invitation.getRecipientId().equals(userId)) throw new BadRequestException("Chỉ người nhận mới có thể phản hồi lời mời");
        if (invitation.getStatus() != MovieMatchInvitation.Status.PENDING) throw new BadRequestException("Lời mời này đã được phản hồi");
        if (decision == MovieMatchingDto.InvitationDecision.ACCEPT) {
            Showtime showtime = showtimeRepository.findById(invitation.getShowtimeId())
                    .orElseThrow(() -> new BadRequestException("Suất chiếu không còn tồn tại"));
            if (!showtime.getStartTime().isAfter(LocalDateTime.now())) throw new BadRequestException("Suất chiếu đã bắt đầu hoặc đã kết thúc");
            invitation.setStatus(MovieMatchInvitation.Status.ACCEPTED);
        } else {
            invitation.setStatus(MovieMatchInvitation.Status.DECLINED);
        }
        invitation.setRespondedAt(LocalDateTime.now());
        MovieMatchInvitation saved = invitationRepository.save(invitation);
        if (saved.getStatus() == MovieMatchInvitation.Status.ACCEPTED) {
            groupBookingService.createForAcceptedInvitation(saved);
        }
        UUID sender = invitation.getSenderId();
        realtimeEventService.sendUserEvent(sender, "MATCH_INVITATION_UPDATED", Map.of("matchId", match.getId(), "invitationId", saved.getId()));
        realtimeEventService.sendMatchEvent(match.getId(), "MATCH_INVITATION_UPDATED", Map.of(
                "matchId", match.getId(), "invitation", toInvitation(saved)));
        realtimeEventService.notifyUser(sender, "MATCH_INVITATION_UPDATED", "Phản hồi lời mời",
                displayName(requireUser(userId)) + (saved.getStatus() == MovieMatchInvitation.Status.ACCEPTED ? " đã chấp nhận lời mời" : " đã từ chối lời mời"), "/intelligence");
        return toInvitation(saved);
    }

    @Transactional
    public void cancelMatch(UUID userId, UUID matchId) {
        MovieMatch match = requireActiveMember(matchId, userId);
        UUID otherId = other(match, userId);
        actionRepository.deleteByActorIdAndTargetIdOrActorIdAndTargetId(userId, otherId, otherId, userId);
        match.setStatus(MovieMatch.Status.CANCELLED); match.setEndedAt(LocalDateTime.now()); match.setEndedBy(userId);
        matchRepository.save(match);
        groupBookingService.cancelForMatch(matchId);
        realtimeEventService.notifyUser(otherId, "MATCH_CANCELLED", "Match đã kết thúc",
                displayName(requireUser(userId)) + " đã hủy match", "/intelligence");
    }

    @Transactional
    public void block(UUID userId, UUID matchId) {
        MovieMatch match = requireActiveMember(matchId, userId);
        UUID blockedId = other(match, userId);
        if (!blockRepository.existsByBlockerIdAndBlockedId(userId, blockedId)) {
            blockRepository.save(MovieMatchingBlock.builder().blockerId(userId).blockedId(blockedId).build());
        }
        actionRepository.deleteByActorIdAndTargetIdOrActorIdAndTargetId(userId, blockedId, blockedId, userId);
        match.setStatus(MovieMatch.Status.BLOCKED); match.setEndedAt(LocalDateTime.now()); match.setEndedBy(userId);
        matchRepository.save(match);
        groupBookingService.cancelForMatch(matchId);
    }

    @Transactional
    public void report(UUID userId, UUID matchId, MovieMatchingDto.ReportRequest request) {
        MovieMatch match = requireMember(matchId, userId);
        UUID reportedId = other(match, userId);
        reportRepository.save(MovieMatchingReport.builder().matchId(matchId).reporterId(userId).reportedId(reportedId)
                .reason(request.getReason().trim()).details(clean(request.getDetails())).build());
    }

    private MovieMatch requireActiveMember(UUID matchId, UUID userId) {
        MovieMatch match = requireMember(matchId, userId);
        if (match.getStatus() != MovieMatch.Status.ACTIVE) throw new BadRequestException("Match này không còn hoạt động");
        return match;
    }

    private MovieMatch requireMember(UUID matchId, UUID userId) {
        MovieMatch match = matchRepository.findById(matchId).orElseThrow(() -> new BadRequestException("Không tìm thấy match"));
        if (!match.getUserOneId().equals(userId) && !match.getUserTwoId().equals(userId)) throw new BadRequestException("Bạn không thuộc match này");
        return match;
    }

    private UUID other(MovieMatch match, UUID userId) { return match.getUserOneId().equals(userId) ? match.getUserTwoId() : match.getUserOneId(); }
    private User requireUser(UUID userId) { return userRepository.findById(userId).orElseThrow(() -> new BadRequestException("Không tìm thấy người dùng")); }
    private String displayName(User user) { return user.getFullName() == null || user.getFullName().isBlank() ? user.getEmail() : user.getFullName(); }
    private String clean(String value) { return value == null || value.trim().isEmpty() ? null : value.trim(); }

    private MovieMatchingDto.MessageResponse toMessage(MovieMatchMessage message, User sender) {
        return MovieMatchingDto.MessageResponse.builder().id(message.getId()).matchId(message.getMatchId())
                .senderId(message.getSenderId()).senderName(sender == null ? "Thành viên" : displayName(sender))
                .content(message.getContent()).createdAt(message.getCreatedAt()).build();
    }

    private MovieMatchingDto.InvitationResponse toInvitation(MovieMatchInvitation invitation) {
        Showtime showtime = showtimeRepository.findById(invitation.getShowtimeId()).orElse(null);
        Movie movie = showtime == null ? null : movieRepository.findById(showtime.getMovieId()).orElse(null);
        CinemaRoom room = showtime == null ? null : roomRepository.findById(showtime.getCinemaRoomId()).orElse(null);
        Theater theater = room == null || room.getTheaterId() == null ? null : theaterRepository.findById(room.getTheaterId()).orElse(null);
        GroupBooking groupBooking = invitation.getStatus() == MovieMatchInvitation.Status.ACCEPTED
                ? groupBookingService.findByInvitationId(invitation.getId()).orElse(null)
                : null;
        boolean showtimeExpired = showtime == null || !showtime.getStartTime().isAfter(LocalDateTime.now());
        boolean groupBookingExpired = invitation.getStatus() == MovieMatchInvitation.Status.ACCEPTED
                && (groupBooking == null || List.of(GroupBookingStatus.EXPIRED, GroupBookingStatus.CANCELLED)
                .contains(groupBooking.getStatus()));
        boolean expired = showtimeExpired || groupBookingExpired;
        boolean canSelectSeats = !expired && groupBooking != null
                && groupBooking.getStatus() == GroupBookingStatus.WAITING_SELECTION;
        UUID groupBookingId = groupBooking == null ? null : groupBooking.getId();
        boolean canOpenGroupBooking = !expired && groupBooking != null
                && !List.of(GroupBookingStatus.EXPIRED, GroupBookingStatus.CANCELLED).contains(groupBooking.getStatus());
        return MovieMatchingDto.InvitationResponse.builder().id(invitation.getId()).matchId(invitation.getMatchId())
                .senderId(invitation.getSenderId()).recipientId(invitation.getRecipientId()).showtimeId(invitation.getShowtimeId())
                .movieTitle(movie == null ? "Phim" : movie.getTitle()).theaterName(theater == null ? null : theater.getName())
                .roomName(room == null ? null : room.getName()).startTime(showtime == null ? null : showtime.getStartTime())
                .status(invitation.getStatus().name()).createdAt(invitation.getCreatedAt()).respondedAt(invitation.getRespondedAt())
                .groupBookingId(groupBookingId)
                .groupBookingStatus(groupBooking == null ? null : groupBooking.getStatus().name())
                .bookingPath(canOpenGroupBooking ? "/booking/group/" + groupBookingId : null)
                .expired(expired).canSelectSeats(canSelectSeats).build();
    }
}
