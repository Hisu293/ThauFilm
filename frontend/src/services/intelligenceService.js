import api from './api';
const unwrap = (response) => response?.data?.data;

export const adminIntelligenceService = {
  heatmap: (roomId) => api.get('/api/admin/intelligence/seat-heatmap', { params: { roomId } }).then(unwrap),
  pricing: () => api.get('/api/admin/intelligence/pricing').then(unwrap),
  applyPricing: (showtimeId, prices) => api.post(`/api/admin/intelligence/pricing/${showtimeId}/apply`, { prices }).then(unwrap),
  weeklyPlan: ({ startDate, movieId }) => api.get('/api/admin/intelligence/weekly-plan', {
    params: { startDate, movieId },
  }).then(unwrap),
  applyWeeklyPlan: (plan) => api.post('/api/admin/intelligence/weekly-plan/apply', plan).then(unwrap),
};

export const memberIntelligenceService = {
  leaderboard: () => api.get('/api/member/intelligence/leaderboard').then(unwrap),
  achievements: () => api.get('/api/member/intelligence/achievements').then(unwrap),
  dating: (payload) => api.post('/api/member/intelligence/dating', payload).then(unwrap),
  matchingProfile: () => api.get('/api/member/matching/profile').then(unwrap),
  saveMatchingProfile: (payload) => api.put('/api/member/matching/profile', payload).then(unwrap),
  uploadMatchingPhoto: (image) => {
    const formData = new FormData();
    formData.append('image', image);
    return api.post('/api/member/matching/profile/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(unwrap);
  },
  removeMatchingPhoto: () => api.delete('/api/member/matching/profile/photo').then(unwrap),
  matchingCandidates: () => api.get('/api/member/matching/candidates').then(unwrap),
  passedMatchingCandidates: () => api.get('/api/member/matching/candidates/passed').then(unwrap),
  restoreMatchingCandidate: (targetId) => api.delete(`/api/member/matching/candidates/${targetId}/action`).then(unwrap),
  matchingAction: (targetId, decision) => api.post(`/api/member/matching/candidates/${targetId}/action`, { decision }).then(unwrap),
  matches: () => api.get('/api/member/matching/matches').then(unwrap),
  matchMessages: (matchId) => api.get(`/api/member/matching/matches/${matchId}/messages`).then(unwrap),
  sendMatchMessage: (matchId, content) => api.post(`/api/member/matching/matches/${matchId}/messages`, { content }).then(unwrap),
  matchInvitations: (matchId) => api.get(`/api/member/matching/matches/${matchId}/invitations`).then(unwrap),
  sendMatchInvitation: (matchId, showtimeId) => api.post(`/api/member/matching/matches/${matchId}/invitations`, { showtimeId }).then(unwrap),
  respondMatchInvitation: (invitationId, decision) => api.put(`/api/member/matching/invitations/${invitationId}`, { decision }).then(unwrap),
  cancelMatch: (matchId) => api.delete(`/api/member/matching/matches/${matchId}`).then(unwrap),
  blockMatch: (matchId) => api.post(`/api/member/matching/matches/${matchId}/block`).then(unwrap),
  reportMatch: (matchId, payload) => api.post(`/api/member/matching/matches/${matchId}/report`, payload).then(unwrap),
};
