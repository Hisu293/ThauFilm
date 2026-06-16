CREATE TABLE IF NOT EXISTS discounts (
    id UUID PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    value NUMERIC(10,2) NOT NULL,
    min_purchase_amount NUMERIC(10,2) NOT NULL,
    max_discount_amount NUMERIC(10,2) NOT NULL,
    valid_from TIMESTAMP NOT NULL,
    valid_to TIMESTAMP NOT NULL,
    usage_limit INTEGER NOT NULL,
    usage_count INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS discount_usages (
    id UUID PRIMARY KEY,
    discount_id UUID NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    used_at TIMESTAMP NOT NULL
);

INSERT INTO discounts (id, code, name, type, value, min_purchase_amount, max_discount_amount, valid_from, valid_to, usage_limit, active)
VALUES
    (gen_random_uuid(), 'WEDTHU45', 'Giảm giá thành viên ngày thứ 3/thứ 4', 'FIXED', 15000, 45000, 75000, '2026-01-01 00:00:00', '2027-12-31 23:59:59', 1000, TRUE),
    (gen_random_uuid(), 'PAYMENT20', 'Giảm 20% khi thanh toán qua ví điện tử/ngân hàng', 'PERCENTAGE', 20, 50000, 100000, '2026-01-01 00:00:00', '2027-12-31 23:59:59', 500, TRUE),
    (gen_random_uuid(), 'COMBO10', 'Giảm 10% combo bắp nước', 'PERCENTAGE', 10, 30000, 50000, '2026-01-01 00:00:00', '2027-12-31 23:59:59', 200, TRUE);
