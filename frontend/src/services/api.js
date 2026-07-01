import axios from 'axios';
import { clearAuthStorageAndReload, getAccessToken } from '../utils/authStorage';

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
  (error) => {
    if (!error.response) {
      return Promise.reject(
        new Error(`Không thể kết nối đến API tại ${API_BASE_URL}. Hãy kiểm tra backend đã chạy trên 8080 và CORS.`)
      );
    }

    if ([401, 403].includes(error.response.status) && getAccessToken()) {
      clearAuthStorageAndReload();
      window.location.assign('/login');
    }

    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Something went wrong';

    return Promise.reject(new Error(message));
  }
);

export default api;
