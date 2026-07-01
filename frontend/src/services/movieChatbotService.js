import api from './api';

const unwrap = (response) => response?.data?.data ?? response?.data ?? response;

export const movieChatbotService = {
  chat: async (message) => unwrap(await api.post('/api/movie-chatbot', { message })),
};
