/**
 * Dữ liệu mock cho module "Quản lý khuyến mãi (Staff)".
 * Khớp schema backend GET/POST/PUT /api/staff/promotions.
 *
 * type: PERCENT (giảm theo %) | FIXED (giảm số tiền cố định).
 * Mảng là "DB trong bộ nhớ": create/update/enable/disable ghi trực tiếp.
 */
export const staffPromotionsDb = [
  {
    id: 'pr100000-0000-0000-0000-000000000001',
    code: 'CHAOHE2026',
    name: 'Chào hè 2026 - giảm 20%',
    type: 'PERCENT',
    value: 20,
    minPurchaseAmount: 100000,
    maxDiscountAmount: 50000,
    validFrom: '2026-06-01T00:00:00.000Z',
    validTo: '2026-08-31T23:59:59.000Z',
    usageLimit: 100,
    usedCount: 37,
    active: true,
  },
  {
    id: 'pr100000-0000-0000-0000-000000000002',
    code: 'GIAM30K',
    name: 'Giảm 30.000đ cho đơn từ 150.000đ',
    type: 'FIXED',
    value: 30000,
    minPurchaseAmount: 150000,
    maxDiscountAmount: 30000,
    validFrom: '2026-06-10T00:00:00.000Z',
    validTo: '2026-06-30T23:59:59.000Z',
    usageLimit: 50,
    usedCount: 50,
    active: true,
  },
  {
    id: 'pr100000-0000-0000-0000-000000000003',
    code: 'MEMBER10',
    name: 'Thành viên - giảm 10%',
    type: 'PERCENT',
    value: 10,
    minPurchaseAmount: 0,
    maxDiscountAmount: 40000,
    validFrom: '2026-05-01T00:00:00.000Z',
    validTo: '2026-12-31T23:59:59.000Z',
    usageLimit: 1000,
    usedCount: 215,
    active: false,
  },
];

/** Các field hợp lệ cho POST/PUT /api/staff/promotions. */
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
 * Lấy field theo schema GET. Schema gốc kết thúc ở `active`, nhưng để phục vụ
 * chức năng "theo dõi số lần sử dụng" mình kèm thêm usageLimit/usedCount
 * (nhiều backend cũng trả sẵn trong list). Có thể bỏ 2 dòng cuối nếu backend không trả.
 */
export const toPromotionDto = (p) => ({
  id: p.id,
  code: p.code,
  name: p.name,
  type: p.type,
  value: p.value,
  minPurchaseAmount: p.minPurchaseAmount,
  maxDiscountAmount: p.maxDiscountAmount,
  validFrom: p.validFrom,
  validTo: p.validTo,
  active: p.active,
  usageLimit: p.usageLimit ?? null,
  usedCount: p.usedCount ?? 0,
});

/** Thống kê số lần sử dụng (cho endpoint /usage). */
export const buildUsage = (p) => ({
  promotionId: p.id,
  code: p.code,
  usageLimit: p.usageLimit ?? null,
  usedCount: p.usedCount ?? 0,
  remaining: p.usageLimit != null ? Math.max(0, p.usageLimit - (p.usedCount ?? 0)) : null,
});
