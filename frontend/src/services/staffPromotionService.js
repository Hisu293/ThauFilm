import api from './api';

/** Các field hợp lệ cho tạo/cập nhật mã giảm giá (khớp StaffPromotionRequest backend). */
export const STAFF_PROMOTION_FIELDS = [
  'code',
  'name',
  'type',
  'value',
  'minPurchaseAmount',
  'maxDiscountAmount',
  'validFrom',
  'validTo',
  'usageLimit',
  'active',
];

/**
 * Service cho module "Quản lý khuyến mãi (Staff)".
 * Nghiệp vụ: xem / tạo mã giảm giá, kích hoạt / vô hiệu hóa, theo dõi số lần dùng.
 *
 * Endpoint backend:
 *   GET  /api/staff/promotions
 *   GET  /api/staff/promotions/{id}
 *   GET  /api/staff/promotions/{id}/usage
 *   POST /api/staff/promotions
 *   PUT  /api/staff/promotions/{id}
 *   PUT  /api/staff/promotions/{id}/enable
 *   PUT  /api/staff/promotions/{id}/disable
 */

const unwrap = (res) => (res?.data?.data !== undefined ? res.data.data : res?.data);

/** Chỉ giữ field hợp lệ, ép kiểu số cho các field tiền/giá trị/giới hạn. */
export const toPromotionPayload = (form) => {
  const payload = {};
  for (const key of STAFF_PROMOTION_FIELDS) {
    if (form[key] !== undefined && form[key] !== '') payload[key] = form[key];
  }
  ['value', 'minPurchaseAmount', 'maxDiscountAmount', 'usageLimit'].forEach((k) => {
    if (payload[k] !== undefined) payload[k] = Number(payload[k]);
  });
  if (form.active !== undefined) payload.active = Boolean(form.active);
  return payload;
};

export const staffPromotionService = {
  /** GET /api/staff/promotions — danh sách mã giảm giá */
  list: () => api.get('/api/staff/promotions').then(unwrap),

  /** GET /api/staff/promotions/{id} — chi tiết */
  getById: (promotionId) => api.get(`/api/staff/promotions/${promotionId}`).then(unwrap),

  /** GET /api/staff/promotions/{id}/usage — thống kê số lần sử dụng */
  getUsage: (promotionId) => api.get(`/api/staff/promotions/${promotionId}/usage`).then(unwrap),

  /** POST /api/staff/promotions — tạo mã giảm giá */
  create: (form) => api.post('/api/staff/promotions', toPromotionPayload(form)).then(unwrap),

  /** PUT /api/staff/promotions/{id} — cập nhật */
  update: (promotionId, form) => api.put(`/api/staff/promotions/${promotionId}`, toPromotionPayload(form)).then(unwrap),

  /** PUT /api/staff/promotions/{id}/enable — kích hoạt */
  enable: (promotionId) => api.put(`/api/staff/promotions/${promotionId}/enable`).then(unwrap),

  /** PUT /api/staff/promotions/{id}/disable — vô hiệu hóa */
  disable: (promotionId) => api.put(`/api/staff/promotions/${promotionId}/disable`).then(unwrap),
};

export default staffPromotionService;
