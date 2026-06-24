import api from './api';
const unwrap = (response) => response?.data?.data;

export const adminIntelligenceService = {
  heatmap: (roomId) => api.get('/api/admin/intelligence/seat-heatmap', { params: { roomId } }).then(unwrap),
  pricing: () => api.get('/api/admin/intelligence/pricing').then(unwrap),
  applyPricing: (showtimeId, prices) => api.post(`/api/admin/intelligence/pricing/${showtimeId}/apply`, { prices }).then(unwrap),
  weeklyPlan: (startDate) => api.get('/api/admin/intelligence/weekly-plan', { params: { startDate } }).then(unwrap),
  applyWeeklyPlan: (plan) => api.post('/api/admin/intelligence/weekly-plan/apply', plan).then(unwrap),
};

export const memberIntelligenceService = {
  leaderboard: () => api.get('/api/member/intelligence/leaderboard').then(unwrap),
  achievements: () => api.get('/api/member/intelligence/achievements').then(unwrap),
  dating: (payload) => api.post('/api/member/intelligence/dating', payload).then(unwrap),
};
