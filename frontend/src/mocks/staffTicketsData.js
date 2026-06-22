/**
 * Dữ liệu mock cho module "Quản lý vé (Staff)".
 * Schema backend của vé khá tối giản (id, bookingId, seatId, ticketCode, checkedIn);
 * mình bổ sung thêm các field hiển thị (khách, phim, ghế, suất, thanh toán) để UI
 * thể hiện đủ nghiệp vụ. Khi backend trả schema đầy đủ, chỉ cần ánh xạ lại.
 *
 * Mảng này là "DB trong bộ nhớ": check-in / hủy ghi trực tiếp nên dữ liệu
 * giữ nguyên trong suốt phiên chạy.
 */
export const staffTicketsDb = [
  {
    id: 'tk100000-0000-0000-0000-000000000001',
    bookingId: 'BK733988',
    seatId: 'seat-c6',
    ticketCode: 'TCK-2001',
    checkedIn: false,
    // Thông tin mở rộng (ngoài schema gốc) phục vụ hiển thị
    status: 'PAID', // PAID | CHECKED_IN | CANCELLED
    customerName: 'Nguyễn Văn An',
    customerEmail: 'an.nguyen@example.com',
    customerPhone: '0369654354',
    movieTitle: 'Bố Già',
    theaterName: 'ThauFilm Cinema',
    roomName: 'Phòng Fly',
    seatLabel: 'C6',
    showtime: '2026-06-23T17:42:00.000Z',
    payment: {
      method: 'Thẻ ngân hàng (ATM/Visa/Mastercard)',
      amount: 120000,
      status: 'PAID',
      paidAt: '2026-06-20T10:15:00.000Z',
      transactionId: 'TXN-9F2A77',
    },
  },
  {
    id: 'tk100000-0000-0000-0000-000000000002',
    bookingId: 'BK733988',
    seatId: 'seat-c7',
    ticketCode: 'TCK-2002',
    checkedIn: true,
    status: 'CHECKED_IN',
    customerName: 'Nguyễn Văn An',
    customerEmail: 'an.nguyen@example.com',
    customerPhone: '0369654354',
    movieTitle: 'Bố Già',
    theaterName: 'ThauFilm Cinema',
    roomName: 'Phòng Fly',
    seatLabel: 'C7',
    showtime: '2026-06-23T17:42:00.000Z',
    payment: {
      method: 'Thẻ ngân hàng (ATM/Visa/Mastercard)',
      amount: 120000,
      status: 'PAID',
      paidAt: '2026-06-20T10:15:00.000Z',
      transactionId: 'TXN-9F2A77',
    },
  },
  {
    id: 'tk100000-0000-0000-0000-000000000003',
    bookingId: 'BK512004',
    seatId: 'seat-a3',
    ticketCode: 'TCK-2003',
    checkedIn: false,
    status: 'PAID',
    customerName: 'Trần Thị Bình',
    customerEmail: 'binh.tran@example.com',
    customerPhone: '0868686868',
    movieTitle: 'Đất Rừng Phương Nam',
    theaterName: 'Galaxy Nguyễn Huệ',
    roomName: 'Phòng VIP',
    seatLabel: 'A3',
    showtime: '2026-06-23T15:16:00.000Z',
    payment: {
      method: 'Ví điện tử (Momo/ZaloPay)',
      amount: 90000,
      status: 'PAID',
      paidAt: '2026-06-19T20:40:00.000Z',
      transactionId: 'TXN-5C1B02',
    },
  },
  {
    id: 'tk100000-0000-0000-0000-000000000004',
    bookingId: 'BK512004',
    seatId: 'seat-a4',
    ticketCode: 'TCK-2004',
    checkedIn: false,
    status: 'CANCELLED',
    customerName: 'Trần Thị Bình',
    customerEmail: 'binh.tran@example.com',
    customerPhone: '0868686868',
    movieTitle: 'Đất Rừng Phương Nam',
    theaterName: 'Galaxy Nguyễn Huệ',
    roomName: 'Phòng VIP',
    seatLabel: 'A4',
    showtime: '2026-06-23T15:16:00.000Z',
    payment: {
      method: 'Ví điện tử (Momo/ZaloPay)',
      amount: 90000,
      status: 'REFUNDED',
      paidAt: '2026-06-19T20:40:00.000Z',
      transactionId: 'TXN-5C1B02',
    },
  },
];

/** Chỉ lấy đúng các field theo schema backend (loại bỏ field hiển thị mở rộng). */
export const toTicketDto = (t) => ({
  id: t.id,
  bookingId: t.bookingId,
  seatId: t.seatId,
  ticketCode: t.ticketCode,
  checkedIn: t.checkedIn,
});
