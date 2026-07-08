package com.filmticket.service;

import com.filmticket.dto.FavoriteListResponse;
import com.filmticket.dto.MovieCardResponse;
import com.filmticket.entity.FavoriteList;
import com.filmticket.entity.FavoriteListItem;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.FavoriteListItemRepository;
import com.filmticket.repository.FavoriteListRepository;
import com.filmticket.repository.MovieRepository;
import com.filmticket.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FavoriteListService {

    private final FavoriteListRepository favoriteListRepository;
    private final FavoriteListItemRepository favoriteListItemRepository;
    private final MovieRepository movieRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<FavoriteListResponse> getMyLists(UUID userId) {
        return favoriteListRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::enrichWithMovieCount)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public FavoriteListResponse getListById(UUID listId, UUID currentUserId) {
        FavoriteList list = getListOrThrow(listId);

        if (!list.getIsPublic() && !list.getUserId().equals(currentUserId)) {
            throw new BadRequestException("This list is private");
        }

        FavoriteListResponse response = enrichWithMovieCount(list);
        response.setMovies(getMoviesInList(listId));
        return response;
    }

    @Transactional(readOnly = true)
    public FavoriteListResponse getPublicList(UUID listId) {
        FavoriteList list = getListOrThrow(listId);
        if (!Boolean.TRUE.equals(list.getIsPublic())) {
            throw new BadRequestException("This list is private");
        }
        FavoriteListResponse response = enrichWithMovieCount(list);
        response.setMovies(getMoviesInList(listId));
        return response;
    }

    @Transactional
    public FavoriteListResponse createList(UUID userId, FavoriteListResponse.CreateRequest request) {
        FavoriteList list = FavoriteList.builder()
                .name(request.getName())
                .userId(userId)
                .isPublic(request.getIsPublic() != null ? request.getIsPublic() : false)
                .build();

        return enrichWithMovieCount(favoriteListRepository.save(list));
    }

    @Transactional
    public FavoriteListResponse updateList(UUID userId, UUID listId, FavoriteListResponse.UpdateRequest request) {
        FavoriteList list = getListOrThrow(listId);

        if (!list.getUserId().equals(userId)) {
            throw new BadRequestException("You can only update your own list");
        }

        if (request.getName() != null) {
            list.setName(request.getName());
        }
        if (request.getIsPublic() != null) {
            list.setIsPublic(request.getIsPublic());
        }

        return enrichWithMovieCount(favoriteListRepository.save(list));
    }

    @Transactional
    public void deleteList(UUID userId, UUID listId) {
        FavoriteList list = getListOrThrow(listId);

        if (!list.getUserId().equals(userId)) {
            throw new BadRequestException("You can only delete your own list");
        }

        favoriteListRepository.delete(list);
    }

    @Transactional
    public FavoriteListResponse addMovieToList(UUID userId, UUID listId, FavoriteListResponse.AddMovieRequest request) {
        FavoriteList list = getListOrThrow(listId);

        if (!list.getUserId().equals(userId)) {
            throw new BadRequestException("You can only add movies to your own list");
        }

        if (!movieRepository.existsById(request.getMovieId())) {
            throw new BadRequestException("Movie not found");
        }

        if (favoriteListItemRepository.existsByFavoriteListIdAndMovieId(listId, request.getMovieId())) {
            throw new BadRequestException("Movie already in this list");
        }

        FavoriteListItem item = FavoriteListItem.builder()
                .favoriteListId(listId)
                .movieId(request.getMovieId())
                .build();

        favoriteListItemRepository.save(item);
        return enrichWithMovieCount(list);
    }

    @Transactional
    public void removeMovieFromList(UUID userId, UUID listId, UUID movieId) {
        FavoriteList list = getListOrThrow(listId);

        if (!list.getUserId().equals(userId)) {
            throw new BadRequestException("You can only remove movies from your own list");
        }

        favoriteListItemRepository.deleteByFavoriteListIdAndMovieId(listId, movieId);
    }

    @Transactional(readOnly = true)
    public List<MovieCardResponse> getMoviesInList(UUID listId) {
        List<FavoriteListItem> items = favoriteListItemRepository.findByFavoriteListIdOrderByAddedAtDesc(listId);
        return items.stream()
                .map(item -> movieRepository.findById(item.getMovieId())
                        .map(MovieCardResponse::fromMovie)
                        .orElse(null))
                .filter(m -> m != null)
                .collect(Collectors.toList());
    }

    private FavoriteList getListOrThrow(UUID listId) {
        return favoriteListRepository.findById(listId)
                .orElseThrow(() -> new BadRequestException("Favorite list not found"));
    }

    private FavoriteListResponse enrichWithMovieCount(FavoriteList list) {
        FavoriteListResponse response = FavoriteListResponse.fromFavoriteList(list);
        response.setMovieCount(favoriteListItemRepository.countByFavoriteListId(list.getId()));
        userRepository.findById(list.getUserId())
                .ifPresent(user -> response.setUserFullName(user.getFullName()));
        return response;
    }
}
