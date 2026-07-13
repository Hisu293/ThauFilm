import api from './api';

const data = (response) => response.data?.data;

export const socialService = {
  getReviews: (movieId) => api.get(`/api/movies/${movieId}/reviews`).then(data),
  getMyReview: (movieId) => api.get(`/api/movies/${movieId}/reviews/me`).then(data),
  getSummary: (movieId) => api.get(`/api/movies/${movieId}/reviews/summary`).then(data),
  getReviewEligibility: (movieId) => api.get(`/api/movies/${movieId}/reviews/eligibility`).then(data),
  getAiSummary: (movieId) => api.get(`/api/movies/${movieId}/reviews/ai-summary`).then(data),
  createReview: (movieId, payload) => api.post(`/api/movies/${movieId}/reviews`, payload).then(data),
  updateReview: (movieId, reviewId, payload) => api.put(`/api/movies/${movieId}/reviews/${reviewId}`, payload).then(data),
  deleteReview: (movieId, reviewId) => api.delete(`/api/movies/${movieId}/reviews/${reviewId}`),

  getComments: (movieId) => api.get(`/api/movies/${movieId}/comments`).then(data),
  createComment: (movieId, content, parentId = null) =>
    api.post(`/api/movies/${movieId}/comments`, { content, parentId }).then(data),
  updateComment: (movieId, commentId, content) =>
    api.put(`/api/movies/${movieId}/comments/${commentId}`, { content }).then(data),
  deleteComment: (movieId, commentId) =>
    api.delete(`/api/movies/${movieId}/comments/${commentId}`),

  getFavoriteLists: () => api.get('/api/favorite-lists/me').then(data),
  getPublicFavoriteList: (listId) => api.get(`/api/favorite-lists/public/${listId}`).then(data),
  getFavoriteList: (listId) => api.get(`/api/favorite-lists/${listId}`).then(data),
  createFavoriteList: (name, isPublic = true) =>
    api.post('/api/favorite-lists', { name, isPublic }).then(data),
  addMovieToList: (listId, movieId) =>
    api.post(`/api/favorite-lists/${listId}/movies`, { movieId }).then(data),
  updateFavoriteList: (listId, payload) =>
    api.put(`/api/favorite-lists/${listId}`, payload).then(data),
  deleteFavoriteList: (listId) => api.delete(`/api/favorite-lists/${listId}`),
  removeMovieFromList: (listId, movieId) =>
    api.delete(`/api/favorite-lists/${listId}/movies/${movieId}`),

  follow: (userId) => api.post(`/api/users/${userId}/follow`),
  unfollow: (userId) => api.delete(`/api/users/${userId}/follow`),
  getFollowStatus: (userId) => api.get(`/api/users/${userId}/follow/status`).then(data),
  getFollowers: (userId) => api.get(`/api/users/${userId}/follow/followers`).then(data),
  getFollowing: (userId) => api.get(`/api/users/${userId}/follow/following`).then(data),

  getCommunityFeed: () => api.get('/api/member/community/feed').then(data),
  getConversations: () => api.get('/api/member/community/messages').then(data),
  getMessages: (partnerId) => api.get(`/api/member/community/messages/${partnerId}`).then(data),
  sendMessage: (recipientId, content) =>
    api.post(`/api/member/community/messages/${recipientId}`, { content }).then(data),
};
