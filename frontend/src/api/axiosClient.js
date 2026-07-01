import axios from 'axios';
import { clearAuthStorageAndReload, getAccessToken } from '../utils/authStorage';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to automatically add authorization token
axiosClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle connection timeouts, errors and extract clean messages
axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (!error.response) {
      return Promise.reject(
        new Error(`Không thể kết nối đến server tại ${API_BASE_URL}. Vui lòng kiểm tra kết nối mạng hoặc server backend.`)
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
      'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.';

    const normalizedError = new Error(message);
    normalizedError.status = error.response?.status;
    normalizedError.details = error.response?.data?.data;
    normalizedError.raw = error.response?.data;

    return Promise.reject(normalizedError);
  }
);

export default axiosClient;
