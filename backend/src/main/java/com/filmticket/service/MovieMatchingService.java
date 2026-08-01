package com.filmticket.service;

import com.filmticket.dto.MovieMatchingDto;
import com.filmticket.entity.*;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.*;
import com.filmticket.websocket.RealtimeEventService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MovieMatchingService {
    private final MovieMatchingProfileRepository profileRepository;
    private final MovieMatchingActionRepository actionRepository;
    private final MovieMatchRepository matchRepository;
    private final MovieMatchingBlockRepository blockRepository;
    private final UserRepository userRepository;
    private final RealtimeEventService realtimeEventService;
    private final CloudinaryStorageService cloudinaryStorageService;

    @Transactional(readOnly = true)
    public MovieMatchingDto.ProfileResponse getProfile(UUID userId) {
        User user = requireUser(userId);
        return profileRepository.findById(userId)
                .map(profile -> toProfile(profile, user, 0))
                .orElseGet(() -> emptyProfile(user));
    }

    @Transactional
    public MovieMatchingDto.ProfileResponse saveProfile(UUID userId, MovieMatchingDto.ProfileRequest request) {
        User user = requireUser(userId);
        List<String> genres = normalizeGenres(request.getFavoriteGenres());
        if (request.isActive() && genres.isEmpty()) {
            throw new BadRequestException("Hãy chọn ít nhất một thể loại trước khi bật tìm bạn xem phim");
        }

        MovieMatchingProfile profile = profileRepository.findById(userId)
                .orElseGet(() -> MovieMatchingProfile.builder().userId(userId).build());
        profile.setBio(clean(request.getBio()));
        profile.setFavoriteGenres(String.join(",", genres));
        profile.setPreferredTheater(clean(request.getPreferredTheater()));
        profile.setAvailableTimes(clean(request.getAvailableTimes()));
        profile.setActive(request.isActive());
        return toProfile(profileRepository.save(profile), user, 0);
    }

    @Transactional
    public MovieMatchingDto.ProfileResponse uploadProfilePhoto(UUID userId, MultipartFile image) {
        User user = requireUser(userId);
        MovieMatchingProfile profile = profileRepository.findById(userId)
                .orElseGet(() -> MovieMatchingProfile.builder().userId(userId).build());
        String previousPublicId = profile.getDatingAvatarPublicId();
        CloudinaryStorageService.UploadedImage uploaded = cloudinaryStorageService.upload(image);
        profile.setDatingAvatarUrl(uploaded.secureUrl());
        profile.setDatingAvatarPublicId(uploaded.publicId());
        try {
            MovieMatchingDto.ProfileResponse response = toProfile(profileRepository.save(profile), user, 0);
            cloudinaryStorageService.deleteQuietly(previousPublicId);
            return response;
        } catch (RuntimeException exception) {
            cloudinaryStorageService.deleteQuietly(uploaded.publicId());
            throw exception;
        }
    }

    @Transactional
    public MovieMatchingDto.ProfileResponse removeProfilePhoto(UUID userId) {
        User user = requireUser(userId);
        MovieMatchingProfile profile = profileRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("Hãy tạo hồ sơ Movie Dating trước"));
        String previousPublicId = profile.getDatingAvatarPublicId();
        profile.setDatingAvatarUrl(null);
        profile.setDatingAvatarPublicId(null);
        MovieMatchingDto.ProfileResponse response = toProfile(profileRepository.save(profile), user, 0);
        cloudinaryStorageService.deleteQuietly(previousPublicId);
        return response;
    }

    @Transactional(readOnly = true)
    public List<MovieMatchingDto.ProfileResponse> getCandidates(UUID userId) {
        MovieMatchingProfile mine = profileRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("Hãy tạo hồ sơ Movie Dating trước"));
        if (!mine.isActive()) {
            throw new BadRequestException("Hãy bật trạng thái tìm bạn xem phim để khám phá thành viên");
        }

        Set<UUID> handled = actionRepository.findByActorId(userId).stream()
                .map(MovieMatchingAction::getTargetId).collect(Collectors.toSet());
        Set<UUID> blocked = blockRepository.findByBlockerIdOrBlockedId(userId, userId).stream()
                .map(item -> item.getBlockerId().equals(userId) ? item.getBlockedId() : item.getBlockerId())
                .collect(Collectors.toSet());
        Map<UUID, User> users = userRepository.findAllById(
                profileRepository.findByActiveTrueAndUserIdNot(userId).stream()
                        .map(MovieMatchingProfile::getUserId).toList()
        ).stream().collect(Collectors.toMap(User::getId, Function.identity()));

        return profileRepository.findByActiveTrueAndUserIdNot(userId).stream()
                .filter(profile -> !handled.contains(profile.getUserId()))
                .filter(profile -> !blocked.contains(profile.getUserId()))
                .filter(profile -> users.containsKey(profile.getUserId()))
                .map(profile -> toProfile(profile, users.get(profile.getUserId()), compatibility(mine, profile)))
                .sorted(Comparator.comparingInt(MovieMatchingDto.ProfileResponse::getCompatibilityPercent).reversed())
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MovieMatchingDto.ProfileResponse> getPassedCandidates(UUID userId) {
        MovieMatchingProfile mine = profileRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("Hãy tạo hồ sơ Movie Dating trước"));
        List<MovieMatchingAction> passed = actionRepository
                .findByActorIdAndDecisionOrderByUpdatedAtDesc(userId, MovieMatchingAction.Decision.PASS);
        Set<UUID> blocked = blockRepository.findByBlockerIdOrBlockedId(userId, userId).stream()
                .map(item -> item.getBlockerId().equals(userId) ? item.getBlockedId() : item.getBlockerId())
                .collect(Collectors.toSet());
        Map<UUID, MovieMatchingProfile> profiles = profileRepository.findAllById(
                        passed.stream().map(MovieMatchingAction::getTargetId).toList()).stream()
                .filter(MovieMatchingProfile::isActive)
                .collect(Collectors.toMap(MovieMatchingProfile::getUserId, Function.identity()));
        Map<UUID, User> users = userRepository.findAllById(profiles.keySet()).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));

        return passed.stream()
                .filter(action -> !blocked.contains(action.getTargetId()))
                .filter(action -> profiles.containsKey(action.getTargetId()) && users.containsKey(action.getTargetId()))
                .map(action -> {
                    MovieMatchingProfile profile = profiles.get(action.getTargetId());
                    MovieMatchingDto.ProfileResponse response = toProfile(
                            profile, users.get(action.getTargetId()), compatibility(mine, profile));
                    response.setLastInteractedAt(action.getUpdatedAt());
                    return response;
                }).toList();
    }

    @Transactional
    public void restoreCandidate(UUID actorId, UUID targetId) {
        MovieMatchingAction action = actionRepository.findByActorIdAndTargetId(actorId, targetId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy lượt bỏ qua này"));
        if (action.getDecision() != MovieMatchingAction.Decision.PASS) {
            throw new BadRequestException("Chỉ có thể hoàn tác hồ sơ đã bỏ qua");
        }
        actionRepository.delete(action);
    }

    @Transactional
    public MovieMatchingDto.ActionResponse act(UUID actorId, UUID targetId, MovieMatchingDto.Decision requestedDecision) {
        if (actorId.equals(targetId)) throw new BadRequestException("Bạn không thể tự chọn chính mình");
        if (blockRepository.existsByBlockerIdAndBlockedId(actorId, targetId) || blockRepository.existsByBlockerIdAndBlockedId(targetId, actorId)) {
            throw new BadRequestException("Không thể tương tác với thành viên này");
        }
        MovieMatchingProfile mine = profileRepository.findById(actorId)
                .orElseThrow(() -> new BadRequestException("Hãy tạo hồ sơ Movie Dating trước"));
        if (!mine.isActive()) throw new BadRequestException("Hồ sơ tìm bạn của bạn đang tắt");
        profileRepository.findById(targetId)
                .filter(MovieMatchingProfile::isActive)
                .orElseThrow(() -> new BadRequestException("Thành viên này hiện không tìm bạn xem phim"));

        MovieMatchingAction.Decision decision = MovieMatchingAction.Decision.valueOf(requestedDecision.name());
        MovieMatchingAction action = actionRepository.findByActorIdAndTargetId(actorId, targetId)
                .orElseGet(() -> MovieMatchingAction.builder().actorId(actorId).targetId(targetId).build());
        action.setDecision(decision);
        actionRepository.save(action);

        if (decision == MovieMatchingAction.Decision.PASS ||
                !actionRepository.existsByActorIdAndTargetIdAndDecision(targetId, actorId, MovieMatchingAction.Decision.LIKE)) {
            return MovieMatchingDto.ActionResponse.builder().matched(false).build();
        }

        // PostgreSQL orders UUID values by their unsigned byte representation.
        // UUID.compareTo compares signed long fields and can produce the opposite
        // order, violating chk_movie_match_order for otherwise valid pairs.
        boolean actorFirst = actorId.toString().compareTo(targetId.toString()) < 0;
        UUID first = actorFirst ? actorId : targetId;
        UUID second = actorFirst ? targetId : actorId;
        MovieMatch match = matchRepository.findByUserOneIdAndUserTwoId(first, second)
                .orElseGet(() -> MovieMatch.builder().userOneId(first).userTwoId(second).build());
        if (match.getStatus() != MovieMatch.Status.ACTIVE) {
            match.setStatus(MovieMatch.Status.ACTIVE);
            match.setEndedAt(null);
            match.setEndedBy(null);
        }
        match = matchRepository.save(match);
        User actor = requireUser(actorId);
        realtimeEventService.notifyUser(targetId, "MOVIE_MATCH", "Bạn có match mới",
                displayName(actor) + " cũng muốn xem phim cùng bạn", "/dating?matchId=" + match.getId());
        realtimeEventService.sendUserEvent(targetId, "MOVIE_MATCH", Map.of("matchId", match.getId()));
        realtimeEventService.sendUserEvent(actorId, "MOVIE_MATCH", Map.of("matchId", match.getId()));
        return MovieMatchingDto.ActionResponse.builder().matched(true).matchId(match.getId()).build();
    }

    @Transactional(readOnly = true)
    public List<MovieMatchingDto.MatchResponse> getMatches(UUID userId) {
        List<MovieMatch> matches = matchRepository.findAllForUser(userId, MovieMatch.Status.ACTIVE);
        Set<UUID> otherIds = matches.stream().map(match -> match.getUserOneId().equals(userId)
                ? match.getUserTwoId() : match.getUserOneId()).collect(Collectors.toSet());
        Map<UUID, User> users = userRepository.findAllById(otherIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
        Map<UUID, MovieMatchingProfile> profiles = profileRepository.findAllById(otherIds).stream()
                .collect(Collectors.toMap(MovieMatchingProfile::getUserId, Function.identity()));
        MovieMatchingProfile mine = profileRepository.findById(userId).orElse(null);

        return matches.stream().map(match -> {
            UUID otherId = match.getUserOneId().equals(userId) ? match.getUserTwoId() : match.getUserOneId();
            User other = users.get(otherId);
            MovieMatchingProfile profile = profiles.get(otherId);
            MovieMatchingDto.ProfileResponse person = profile == null
                    ? emptyProfile(other)
                    : toProfile(profile, other, mine == null ? 0 : compatibility(mine, profile));
            return MovieMatchingDto.MatchResponse.builder().matchId(match.getId())
                    .matchedAt(match.getCreatedAt()).person(person).build();
        }).toList();
    }

    private User requireUser(UUID id) {
        return userRepository.findById(id).orElseThrow(() -> new BadRequestException("Không tìm thấy người dùng"));
    }

    private MovieMatchingDto.ProfileResponse toProfile(MovieMatchingProfile profile, User user, int compatibility) {
        return MovieMatchingDto.ProfileResponse.builder().userId(profile.getUserId())
                .fullName(displayName(user)).avatarUrl(profile.getDatingAvatarUrl() != null
                        ? profile.getDatingAvatarUrl() : user == null ? null : user.getAvatarUrl())
                .customDatingPhoto(profile.getDatingAvatarUrl() != null)
                .bio(profile.getBio()).favoriteGenres(split(profile.getFavoriteGenres()))
                .preferredTheater(profile.getPreferredTheater()).availableTimes(profile.getAvailableTimes())
                .active(profile.isActive()).compatibilityPercent(compatibility).build();
    }

    private MovieMatchingDto.ProfileResponse emptyProfile(User user) {
        return MovieMatchingDto.ProfileResponse.builder().userId(user == null ? null : user.getId())
                .fullName(displayName(user)).avatarUrl(user == null ? null : user.getAvatarUrl())
                .favoriteGenres(List.of()).active(false).compatibilityPercent(0).build();
    }

    private int compatibility(MovieMatchingProfile a, MovieMatchingProfile b) {
        Set<String> left = normalizedSet(split(a.getFavoriteGenres()));
        Set<String> right = normalizedSet(split(b.getFavoriteGenres()));
        Set<String> union = new HashSet<>(left); union.addAll(right);
        Set<String> common = new HashSet<>(left); common.retainAll(right);
        int genreScore = union.isEmpty() ? 0 : (int) Math.round(common.size() * 80.0 / union.size());
        int theaterScore = sameText(a.getPreferredTheater(), b.getPreferredTheater()) ? 10 : 0;
        int timeScore = sameText(a.getAvailableTimes(), b.getAvailableTimes()) ? 10 : 0;
        return Math.min(100, genreScore + theaterScore + timeScore);
    }

    private List<String> normalizeGenres(List<String> values) {
        if (values == null) return List.of();
        return values.stream().map(this::clean).filter(Objects::nonNull)
                .map(value -> value.replace(",", " ")).distinct().limit(20).toList();
    }

    private List<String> split(String csv) {
        if (csv == null || csv.isBlank()) return List.of();
        return Arrays.stream(csv.split(",")).map(String::trim).filter(value -> !value.isBlank()).toList();
    }

    private Set<String> normalizedSet(List<String> values) {
        return values.stream().map(value -> value.toLowerCase(Locale.ROOT)).collect(Collectors.toSet());
    }

    private boolean sameText(String a, String b) {
        return a != null && b != null && !a.isBlank() && a.trim().equalsIgnoreCase(b.trim());
    }

    private String clean(String value) {
        return value == null || value.trim().isEmpty() ? null : value.trim();
    }

    private String displayName(User user) {
        if (user == null) return "Thành viên";
        return user.getFullName() == null || user.getFullName().isBlank() ? user.getEmail() : user.getFullName();
    }
}
