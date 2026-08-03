import api from './api';
import { viewingConfig } from './movieStreamService';

const unwrap = (response) => response?.data?.data ?? response?.data ?? response;

export const watchPartyService = {
  create: async (movieId, showtimeId) => unwrap(await api.post('/api/member/watch-parties', { movieId, showtimeId })),
  get: async (roomId) => unwrap(await api.get(`/api/member/watch-parties/${roomId}`)),
  stream: async (roomId) => unwrap(await api.get(
    `/api/member/watch-parties/${roomId}/stream`,
    viewingConfig(),
  )),
  heartbeatStream: async (roomId) => unwrap(await api.post(
    `/api/member/watch-parties/${roomId}/stream/heartbeat`,
    null,
    viewingConfig(),
  )),
  releaseStream: async (roomId) => unwrap(await api.post(
    `/api/member/watch-parties/${roomId}/stream/release`,
    null,
    viewingConfig(),
  )),
  pay: async (roomId, discountCode = '') => unwrap(await api.post(`/api/member/watch-parties/${roomId}/pay`, { discountCode })),
  syncPayment: async (roomId) => unwrap(await api.post(`/api/member/watch-parties/${roomId}/sync-payment`)),
  refund: async (roomId, payload) => unwrap(await api.post(`/api/member/watch-parties/${roomId}/refund`, payload)),
};

export default watchPartyService;
