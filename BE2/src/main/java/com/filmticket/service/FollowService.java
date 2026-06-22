package com.filmticket.service;

import com.filmticket.dto.FollowResponse;
import com.filmticket.entity.Follow;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.FollowRepository;
import com.filmticket.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FollowService {

    private final FollowRepository followRepository;
    private final UserRepository userRepository;

    @Transactional
    public void follow(UUID followerId, UUID followingId) {
        if (followerId.equals(followingId)) {
            throw new BadRequestException("You cannot follow yourself");
        }

        if (!userRepository.existsById(followingId)) {
            throw new BadRequestException("User not found");
        }

        if (followRepository.existsByFollowerIdAndFollowingId(followerId, followingId)) {
            throw new BadRequestException("You are already following this user");
        }

        Follow follow = Follow.builder()
                .followerId(followerId)
                .followingId(followingId)
                .build();

        followRepository.save(follow);
    }

    @Transactional
    public void unfollow(UUID followerId, UUID followingId) {
        if (!followRepository.existsByFollowerIdAndFollowingId(followerId, followingId)) {
            throw new BadRequestException("You are not following this user");
        }

        followRepository.deleteByFollowerIdAndFollowingId(followerId, followingId);
    }

    @Transactional(readOnly = true)
    public boolean isFollowing(UUID followerId, UUID followingId) {
        return followRepository.existsByFollowerIdAndFollowingId(followerId, followingId);
    }

    @Transactional(readOnly = true)
    public List<FollowResponse.FollowingInfo> getFollowing(UUID userId) {
        List<Follow> follows = followRepository.findByFollowerIdOrderByCreatedAtDesc(userId);
        return follows.stream()
                .map(f -> {
                    FollowResponse.FollowingInfo info = FollowResponse.FollowingInfo.builder()
                            .id(f.getFollowingId())
                            .followedAt(f.getCreatedAt())
                            .build();
                    userRepository.findById(f.getFollowingId()).ifPresent(user -> {
                        info.setFullName(user.getFullName());
                        info.setAvatarUrl(user.getAvatarUrl());
                    });
                    return info;
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<FollowResponse.FollowerInfo> getFollowers(UUID userId) {
        List<Follow> follows = followRepository.findByFollowingIdOrderByCreatedAtDesc(userId);
        return follows.stream()
                .map(f -> {
                    FollowResponse.FollowerInfo info = FollowResponse.FollowerInfo.builder()
                            .id(f.getFollowerId())
                            .followedAt(f.getCreatedAt())
                            .build();
                    userRepository.findById(f.getFollowerId()).ifPresent(user -> {
                        info.setFullName(user.getFullName());
                        info.setAvatarUrl(user.getAvatarUrl());
                    });
                    return info;
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public long getFollowerCount(UUID userId) {
        return followRepository.countByFollowingId(userId);
    }

    @Transactional(readOnly = true)
    public long getFollowingCount(UUID userId) {
        return followRepository.countByFollowerId(userId);
    }

    public List<UUID> getFollowingIds(UUID userId) {
        return followRepository.findFollowingIdsByFollowerId(userId);
    }
}
