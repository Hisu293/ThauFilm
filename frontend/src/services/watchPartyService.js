import api from './api';

const unwrap = (response) => response?.data?.data ?? response?.data ?? response;

export const watchPartyService = {
  create: async (movieId) => unwrap(await api.post('/api/member/watch-parties', { movieId })),
  get: async (roomId) => unwrap(await api.get(`/api/member/watch-parties/${roomId}`)),
  pay: async (roomId) => unwrap(await api.post(`/api/member/watch-parties/${roomId}/pay`)),
  syncPayment: async (roomId) => unwrap(await api.post(`/api/member/watch-parties/${roomId}/sync-payment`)),
};

export default watchPartyService;
