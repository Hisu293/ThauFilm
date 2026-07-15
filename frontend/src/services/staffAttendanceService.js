import api from './api';

const unwrap = (response) => (response?.data?.data !== undefined ? response.data.data : response?.data);

export const staffAttendanceService = {
  today: () => api.get('/api/staff/attendance/today').then(unwrap),
  checkIn: (credential) => api.post('/api/staff/attendance/check-in', { credential }).then(unwrap),
  checkOut: (credential) => api.post('/api/staff/attendance/check-out', { credential }).then(unwrap),
  history: (year, month) => api.get('/api/staff/attendance/me', { params: { year, month } }).then(unwrap),
  todayShift: () => api.get('/api/staff/workforce/schedule/today').then(unwrap),
  schedule: (year, month) => api.get('/api/staff/workforce/schedule', { params: { year, month } }).then(unwrap),
  registerShift: (payload) => api.post('/api/staff/workforce/schedule/register', payload).then(unwrap),
};

export default staffAttendanceService;
