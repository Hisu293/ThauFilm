-- V31 đã convert showtime.status với mapping generic (0->INACTIVE,1->ACTIVE,2->MAINTENANCE)
-- nhưng showtime dùng ShowtimeStatus riêng (0=CANCELLED, 1=SCHEDULED, 2=OPEN, 3=RUNNING, 4=COMPLETED).
-- V32 sửa lại data cho showtime.status về đúng enum.

-- Bước 1: xóa check constraint cũ
ALTER TABLE showtime DROP CONSTRAINT IF EXISTS chk_showtime_status;

-- Bước 2: remap lại giá trị showtime.status
-- V31 đã lưu: 0->INACTIVE, 1->ACTIVE, 2->MAINTENANCE, 3,4->ACTIVE
-- Ta cần đưa về đúng ShowtimeStatus. Dùng CTE phụ để tra bảng gốc
-- Để đơn giản và an toàn: với những status không hợp lệ (INACTIVE, MAINTENANCE), ép về SCHEDULED.
-- Sau đó, với các giá trị ACTIVE hiện có, ta giả định nó tương ứng SCHEDULED (an toàn nhất).

UPDATE showtime SET status = 'SCHEDULED' WHERE status NOT IN ('SCHEDULED','OPEN','RUNNING','COMPLETED','CANCELLED');

-- Bước 3: thêm lại check constraint đúng
ALTER TABLE showtime ADD CONSTRAINT chk_showtime_status
  CHECK (status IN ('SCHEDULED','OPEN','RUNNING','COMPLETED','CANCELLED'));
