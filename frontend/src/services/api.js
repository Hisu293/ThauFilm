import axios from 'axios';
import { clearAuthStorageAndReload, getAccessToken, refreshAccessToken } from '../utils/authStorage';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!error.response) {
      return Promise.reject(
        new Error(`Không thể kết nối đến API tại ${API_BASE_URL}. Hãy kiểm tra backend đã chạy trên 8080 và CORS.`)
      );
    }

    const originalRequest = error.config;
    if (error.response.status === 401 && getAccessToken()) {
      if (!originalRequest?._authRetried) {
        originalRequest._authRetried = true;
        try {
          const accessToken = await refreshAccessToken();
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch {
          clearAuthStorageAndReload();
          window.location.assign('/login');
        }
      } else {
        clearAuthStorageAndReload();
        window.location.assign('/login');
      }
    }

    const serverMessage =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.';
    const message = error.response.status === 403
      && (!serverMessage || /^(forbidden|access denied|request failed with status code 403)$/i.test(serverMessage.trim()))
      ? 'Bạn không có quyền thực hiện thao tác này.'
      : serverMessage;

    return Promise.reject(new Error(message));
  }
);

export default api;
