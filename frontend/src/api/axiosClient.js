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
  (error) => Promise.reject(error)
);

// Response interceptor to handle connection timeouts, errors and extract clean messages
axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (!error.response) {
      return Promise.reject(
        new Error(`KhÃ´ng thá»ƒ káº¿t ná»‘i Ä‘áº¿n server táº¡i ${API_BASE_URL}. Vui lÃ²ng kiá»ƒm tra káº¿t ná»‘i máº¡ng hoáº·c server backend.`)
      );
    }

    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'ÄÃ£ xáº£y ra lá»—i há»‡ thá»‘ng. Vui lÃ²ng thá»­ láº¡i sau.';

    const normalizedError = new Error(message);
    normalizedError.status = error.response?.status;
    normalizedError.details = error.response?.data?.data;
    normalizedError.raw = error.response?.data;

    return Promise.reject(normalizedError);
  }
);

export default axiosClient;
