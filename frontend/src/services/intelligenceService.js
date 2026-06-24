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
  matchingProfile: () => api.get('/api/member/matching/profile').then(unwrap),
  saveMatchingProfile: (payload) => api.put('/api/member/matching/profile', payload).then(unwrap),
  matchingCandidates: () => api.get('/api/member/matching/candidates').then(unwrap),
  matchingAction: (targetId, decision) => api.post(`/api/member/matching/candidates/${targetId}/action`, { decision }).then(unwrap),
  matches: () => api.get('/api/member/matching/matches').then(unwrap),
};
