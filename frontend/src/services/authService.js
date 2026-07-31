import api from './api';

/** Chuẩn hóa body { success, message, data } từ backend */
export function parseAuthResponse(body) {
  const payload = body?.data ?? body ?? {};
  const user = payload.user ?? payload;

  return {
    user: typeof user === 'object' ? user : null,
    accessToken: payload.accessToken ?? payload.token ?? null,
    refreshToken: payload.refreshToken ?? null,
  };
}

export const authService = {
  login: (credentials) => api.post('/api/auth/login', credentials),

  register: (data) => api.post('/api/auth/register', data),
  verifyRegistrationOtp: (email, otp) =>
    api.post('/api/auth/register/verify-otp', { email, otp }),
  resendRegistrationOtp: (email) =>
    api.post('/api/auth/register/resend-otp', { email }),
  requestPasswordResetOtp: (email) =>
    api.post('/api/auth/forgot-password/request-otp', { email }),
  resetPassword: (email, otp, newPassword) =>
    api.post('/api/auth/forgot-password/reset', { email, otp, newPassword }),

  forgotPassword: (email) => api.post('/api/auth/forgot-password', { email }),

  resetPassword: (data) => api.post('/api/auth/reset-password', data),

  /** POST /api/auth/logout — body: { refreshToken } */
  logout: (refreshToken) =>
    api.post('/api/auth/logout', { refreshToken }),

  googleAuth: (idToken) => api.post('/api/auth/google', { idToken }),

  getMe: () => api.get('/api/users/me'),
};
