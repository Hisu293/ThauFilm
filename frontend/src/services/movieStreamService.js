import api from './api';

const unwrap = (response) => response?.data?.data ?? response?.data ?? response;

export const movieStreamService = {
  getMovieStream: (movieId) => api.get(`/api/member/movies/${movieId}/stream`).then(unwrap),
  getWatchPartyStream: (roomId) => api.get(`/api/member/watch-parties/${roomId}/stream`).then(unwrap),
};

export default movieStreamService;
