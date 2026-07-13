package com.filmticket.dto;

import lombok.Builder;
import lombok.Value;

import java.util.Map;
import java.util.UUID;

@Value
@Builder
public class CommunityPostEngagementResponse {
    UUID postId;
    Map<String, Long> reactionCounts;
    String myReaction;
    long commentCount;
    long shareCount;
}
