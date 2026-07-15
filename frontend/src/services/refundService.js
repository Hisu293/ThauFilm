import api from './api';

const unwrap = (res) => (res?.data?.data !== undefined ? res.data.data : res?.data);

export const refundService = {
  staffAccess: () => api.get('/api/staff/refunds/access').then(unwrap),
  staffList: () => api.get('/api/staff/refunds').then(unwrap),
  staffCreate: (payload) => api.post('/api/staff/refunds', payload).then(unwrap),
  staffApprove: (id) => api.post(`/api/staff/refunds/${id}/approve`).then(unwrap),
  staffReject: (id, reason) => api.post(`/api/staff/refunds/${id}/reject`, { reason }).then(unwrap),
  staffMessages: (id) => api.get(`/api/staff/refunds/${id}/messages`).then(unwrap),
  staffSendMessage: (id, content) => api.post(`/api/staff/refunds/${id}/messages`, { content }).then(unwrap),
  adminList: () => api.get('/api/admin/refunds').then(unwrap),
  adminApprove: (id) => api.post(`/api/admin/refunds/${id}/approve`).then(unwrap),
  adminReject: (id, reason) => api.post(`/api/admin/refunds/${id}/reject`, { reason }).then(unwrap),
};

export default refundService;
