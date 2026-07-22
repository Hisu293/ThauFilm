import api from './api';

const unwrap = (res) => (res?.data?.data !== undefined ? res.data.data : res?.data);

export const theaterService = {
  /** 
   * GET /api/theaters — Lấy danh sách rạp ACTIVE (Hỗ trợ lọc theo query param ?city=...)
   * @param {string} [city] - Tỉnh/Thành phố muốn lọc (VD: "Hồ Chí Minh")
   */
  getActiveTheaters: (city) => {
    const params = city ? { city } : {};
    return api.get('/api/theaters', { params }).then(unwrap);
  },

  /** GET /api/theaters/{theaterId} — Xem chi tiết rạp */
  getById: (theaterId) => api.get(`/api/theaters/${theaterId}`).then(unwrap),
};

export default theaterService;