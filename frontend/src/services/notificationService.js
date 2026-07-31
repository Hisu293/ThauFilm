import axiosClient from '../api/axiosClient';

const unwrap = (response) => response?.data?.data ?? response?.data ?? response;

export const notificationService = {
  recent: () => axiosClient.get('/api/member/notifications').then(unwrap),
  markRead: (notificationId) => axiosClient.put(`/api/member/notifications/${notificationId}/read`).then(unwrap),
  markAllRead: () => axiosClient.put('/api/member/notifications/read-all').then(unwrap),
};

export default notificationService;
