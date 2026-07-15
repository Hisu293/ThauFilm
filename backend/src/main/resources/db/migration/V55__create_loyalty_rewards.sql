CREATE TABLE loyalty_accounts (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    points_balance INTEGER NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
    lifetime_earned INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_earned >= 0),
    lifetime_redeemed INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_redeemed >= 0),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE loyalty_rewards (
    id UUID PRIMARY KEY,
    code VARCHAR(40) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    description VARCHAR(500),
    reward_type VARCHAR(20) NOT NULL,
    points_cost INTEGER NOT NULL CHECK (points_cost > 0),
    monetary_value NUMERIC(10,2) NOT NULL CHECK (monetary_value > 0),
    min_purchase_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    validity_days INTEGER NOT NULL DEFAULT 30 CHECK (validity_days > 0),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE loyalty_redemptions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    reward_id UUID NOT NULL,
    discount_id UUID NOT NULL UNIQUE,
    redemption_code VARCHAR(50) NOT NULL UNIQUE,
    points_spent INTEGER NOT NULL CHECK (points_spent > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    redeemed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP
);

CREATE TABLE loyalty_transactions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    booking_id UUID,
    redemption_id UUID,
    transaction_type VARCHAR(20) NOT NULL,
    points INTEGER NOT NULL,
    balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
    description VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX uq_loyalty_earn_booking
    ON loyalty_transactions (booking_id)
    WHERE booking_id IS NOT NULL AND transaction_type = 'EARN';
CREATE INDEX idx_loyalty_transactions_user_created
    ON loyalty_transactions (user_id, created_at DESC);
CREATE INDEX idx_loyalty_redemptions_user_created
    ON loyalty_redemptions (user_id, redeemed_at DESC);

INSERT INTO loyalty_accounts (id, user_id)
SELECT gen_random_uuid(), id FROM users
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO loyalty_rewards
    (id, code, name, description, reward_type, points_cost, monetary_value, min_purchase_amount, validity_days, active, display_order)
VALUES
    ('8ac7ab52-5a7b-4e3b-a6b5-7baed84cf001', 'FREE_2D_TICKET', 'Vé xem phim 2D',
     'Đổi mã giảm tối đa 90.000₫ cho một đơn vé xem phim.', 'TICKET', 900, 90000, 90000, 30, TRUE, 1),
    ('8ac7ab52-5a7b-4e3b-a6b5-7baed84cf002', 'POPCORN_COMBO', 'Combo bắp nước',
     'Đổi mã ưu đãi combo trị giá tối đa 59.000₫.', 'COMBO', 590, 59000, 59000, 30, TRUE, 2),
    ('8ac7ab52-5a7b-4e3b-a6b5-7baed84cf003', 'VOUCHER_30K', 'Voucher 30.000₫',
     'Giảm trực tiếp 30.000₫ cho đơn từ 100.000₫.', 'VOUCHER', 300, 30000, 100000, 45, TRUE, 3)
ON CONFLICT (code) DO NOTHING;
