import axios from 'axios';

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
    const token = localStorage.getItem('cinema_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle connection timeouts, errors and extract clean messages
axiosClient.interceptors.response.use(
  (response) => {
    return response.data; // Return raw data directly if API returns { success, message, data }
  },
  (error) => {
    if (!error.response) {
      return Promise.reject(
        new Error(`Không thể kết nối đến server tại ${API_BASE_URL}. Vui lòng kiểm tra kết nối mạng hoặc server backend.`)
      );
    }

    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.';

    return Promise.reject(new Error(message));
  }
);

export default axiosClient;
