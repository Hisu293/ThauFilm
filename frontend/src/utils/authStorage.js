const AUTH_STORAGE_KEYS = [
  'cinema_token',
  'cinema_refresh_token',
  'cinema_user',
];

export const getAccessToken = () => localStorage.getItem('cinema_token');
export const getRefreshToken = () => localStorage.getItem('cinema_refresh_token');

let refreshRequest = null;

export const refreshAccessToken = async () => {
  if (refreshRequest) return refreshRequest;

  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('Phiên đăng nhập đã hết hạn');

  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  refreshRequest = fetch(`${apiBaseUrl}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
    .then(async (response) => {
      if (!response.ok) throw new Error('Không thể làm mới phiên đăng nhập');
      const body = await response.json();
      const payload = body?.data ?? body;
      const accessToken = payload?.accessToken ?? payload?.token;
      if (!accessToken) throw new Error('Server không trả về access token mới');

      localStorage.setItem('cinema_token', accessToken);
      if (payload?.refreshToken) {
        localStorage.setItem('cinema_refresh_token', payload.refreshToken);
      }
      return accessToken;
    })
    .finally(() => {
      refreshRequest = null;
    });

  return refreshRequest;
};

export const hasStoredAuthToken = () => Boolean(getAccessToken());

export const clearAuthStorage = () => {
  AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
};

export const clearAuthStorageAndReload = () => {
  if (!hasStoredAuthToken()) return;
  clearAuthStorage();
  window.dispatchEvent(new CustomEvent('auth:invalid-token'));
};
