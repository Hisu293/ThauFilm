import api from './api';

const unwrap = (response) => response?.data?.data ?? response?.data ?? response;

const VIEWING_DEVICE_KEY = 'tf_viewing_device_id';

const getViewingDeviceId = () => {
  let deviceId = sessionStorage.getItem(VIEWING_DEVICE_KEY);
  if (!deviceId) {
    deviceId = globalThis.crypto?.randomUUID?.()
      || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(VIEWING_DEVICE_KEY, deviceId);
  }
  return deviceId;
};

const viewingConfig = () => ({
  headers: { 'X-Viewing-Device-Id': getViewingDeviceId() },
});

export const movieStreamService = {
  getMovieStream: (movieId) => api
    .get(`/api/member/movies/${movieId}/stream`, viewingConfig())
    .then(unwrap),
  heartbeat: (movieId) => api
    .post(`/api/member/movies/${movieId}/stream/heartbeat`, null, viewingConfig())
    .then(unwrap),
  release: (movieId) => api
    .post(`/api/member/movies/${movieId}/stream/release`, null, viewingConfig())
    .then(unwrap),
  getWatchPartyStream: (roomId) => api.get(`/api/member/watch-parties/${roomId}/stream`).then(unwrap),
};

export default movieStreamService;
