import api from './api';

const unwrap = (response) => (response?.data?.data !== undefined ? response.data.data : response?.data);

export const staffAttendanceService = {
  today: () => api.get('/api/staff/attendance/today').then(unwrap),
  checkIn: () => api.post('/api/staff/attendance/check-in').then(unwrap),
  checkOut: () => api.post('/api/staff/attendance/check-out').then(unwrap),
  history: (year, month) => api.get('/api/staff/attendance/me', { params: { year, month } }).then(unwrap),
};

export default staffAttendanceService;
