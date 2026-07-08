-- Normalize any legacy or missing roles to MEMBER
UPDATE users
SET role = 'MEMBER'
WHERE role IS NULL
   OR role NOT IN ('ADMIN', 'STAFF', 'MEMBER')
   OR role = 'USER';
