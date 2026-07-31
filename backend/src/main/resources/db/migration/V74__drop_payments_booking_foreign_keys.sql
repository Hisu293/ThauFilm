-- Một số cơ sở dữ liệu cũ tạo khóa ngoại với tên tự sinh thay vì
-- fk_payments_booking, nên V23 không thể gỡ được. Payment của Watch Party
-- dùng booking_id làm mã ngữ cảnh thanh toán và không tham chiếu bookings.
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN
        SELECT DISTINCT constraint_name
        FROM information_schema.key_column_usage
        WHERE table_schema = current_schema()
          AND table_name = 'payments'
          AND column_name = 'booking_id'
          AND position_in_unique_constraint IS NOT NULL
    LOOP
        EXECUTE format(
            'ALTER TABLE %I.%I DROP CONSTRAINT %I',
            current_schema(),
            'payments',
            constraint_record.constraint_name
        );
    END LOOP;
END
$$;
