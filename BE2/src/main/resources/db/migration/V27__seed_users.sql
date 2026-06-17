-- V27: Seed data for users
INSERT INTO users (id, email, password, full_name, phone, avatar_url, provider, role, enabled) VALUES
-- Admin
('00000001-0000-0000-0000-000000000001', 'admin@filmticket.com', 
 '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 
 'Admin User', '0900000001', NULL, 'EMAIL', 'ADMIN', true),

-- Staff
('00000002-0000-0000-0000-000000000002', 'staff@filmticket.com', 
 '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 
 'Staff User', '0900000002', NULL, 'EMAIL', 'STAFF', true),

-- Members
('00000003-0000-0000-0000-000000000003', 'john@example.com', 
 '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 
 'John Smith', '0900000003', NULL, 'EMAIL', 'MEMBER', true),

('00000004-0000-0000-0000-000000000004', 'jane@example.com', 
 '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 
 'Jane Doe', '0900000004', NULL, 'EMAIL', 'MEMBER', true),

('00000005-0000-0000-0000-000000000005', 'bob@example.com', 
 '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 
 'Bob Wilson', '0900000005', NULL, 'EMAIL', 'MEMBER', true)
ON CONFLICT (email) DO NOTHING;

-- Password for all: 123456 (bcrypt hashed)
