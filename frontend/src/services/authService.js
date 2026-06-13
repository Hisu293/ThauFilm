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

  /** POST /api/auth/logout — body: { refreshToken } */
  logout: (refreshToken) =>
    api.post('/api/auth/logout', { refreshToken }),

  googleAuth: (idToken) => api.post('/api/auth/google', { idToken }),

  getMe: () => api.get('/api/users/me'),
};
