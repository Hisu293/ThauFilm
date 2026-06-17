-- V28: Seed data for combos
INSERT INTO combos (id, name, description, price, active) VALUES
(gen_random_uuid(), 'Combo Classic', '1 Bắp (Medium) + 1 Nước (Medium)', 59000, true),
(gen_random_uuid(), 'Combo Large', '1 Bắp (Large) + 2 Nước (Large)', 89000, true),
(gen_random_uuid(), 'Combo Đặc Biệt', '1 Bắp (Large) + 2 Nước (Large) + 1 Khẩu Bắp', 119000, true),
(gen_random_uuid(), 'Combo Kid', '1 Bắp (Small) + 1 Nước ngọt + 1 Kem', 49000, true)
ON CONFLICT DO NOTHING;

-- V28: Seed data for seat_type_price_configs
INSERT INTO seat_type_price_configs (id, seat_type, price, active) VALUES
(gen_random_uuid(), 'STANDARD', 75000, true),
(gen_random_uuid(), 'VIP', 95000, true),
(gen_random_uuid(), 'COUPLE', 130000, true)
ON CONFLICT DO NOTHING;

-- V28: Seed data for discounts
INSERT INTO discounts (id, code, name, type, value, min_purchase_amount, max_discount_amount, 
                       valid_from, valid_to, usage_limit, usage_count, active)
SELECT 
    gen_random_uuid(),
    'WELCOME10',
    'Chào mừng khách hàng mới',
    'PERCENTAGE',
    10,
    50000,
    50000,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '90 days',
    1000,
    0,
    true
WHERE NOT EXISTS (SELECT 1 FROM discounts WHERE code = 'WELCOME10');

INSERT INTO discounts (id, code, name, type, value, min_purchase_amount, max_discount_amount, 
                       valid_from, valid_to, usage_limit, usage_count, active)
SELECT 
    gen_random_uuid(),
    'SUMMER20',
    'Khuyến mãa mùa hè',
    'PERCENTAGE',
    20,
    100000,
    100000,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '30 days',
    500,
    0,
    true
WHERE NOT EXISTS (SELECT 1 FROM discounts WHERE code = 'SUMMER20');

INSERT INTO discounts (id, code, name, type, value, min_purchase_amount, max_discount_amount, 
                       valid_from, valid_to, usage_limit, usage_count, active)
SELECT 
    gen_random_uuid(),
    'FLAT50K',
    'Giảm 50K',
    'FIXED',
    50000,
    200000,
    50000,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '60 days',
    200,
    0,
    true
WHERE NOT EXISTS (SELECT 1 FROM discounts WHERE code = 'FLAT50K');
