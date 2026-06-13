-- Ensure seeded role-test users always use password 123456
UPDATE users
SET password = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
WHERE email IN ('admin@gmail.com', 'staff@filmticket.com', 'member@filmticket.com');
