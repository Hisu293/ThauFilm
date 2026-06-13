-- Seed sample users for role testing
-- Password for all seeded users: 123456
INSERT INTO users (id, username, email, password, full_name, phone, avatar_url, provider, role, enabled)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'admin@gmail.com', 'admin@gmail.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Admin User', '0900000001', NULL, 'EMAIL', 'ADMIN', TRUE),
  ('22222222-2222-2222-2222-222222222222', 'staff@filmticket.com', 'staff@filmticket.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Staff User', '0900000002', NULL, 'EMAIL', 'STAFF', TRUE),
  ('33333333-3333-3333-3333-333333333333', 'member@filmticket.com', 'member@filmticket.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Member User', '0900000003', NULL, 'EMAIL', 'MEMBER', TRUE)
ON CONFLICT (email) DO NOTHING;
