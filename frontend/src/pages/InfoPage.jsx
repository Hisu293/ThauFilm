import { Box, Container, Typography, Divider } from '@mui/material';

// Nội dung tĩnh cho các trang thông tin được liên kết ở footer.
const INFO_CONTENT = {
  faq: {
    title: 'Câu Hỏi Thường Gặp (FAQ)',
    intro: 'Những thắc mắc phổ biến nhất khi đặt vé và sử dụng ThauFilm.',
    sections: [
      { heading: 'Làm sao để đặt vé?', body: 'Chọn phim, chọn suất chiếu và rạp, sau đó chọn ghế và thanh toán. Vé điện tử sẽ được gửi về email và lưu trong mục Tài khoản của bạn.' },
      { heading: 'Tôi có thể hủy vé đã đặt không?', body: 'Vé có thể hủy trước giờ chiếu theo Chính sách hoàn vé. Vui lòng xem mục Chính sách hoàn vé để biết chi tiết thời hạn và phí.' },
      { heading: 'Thanh toán bằng hình thức nào?', body: 'ThauFilm hỗ trợ thẻ ngân hàng nội địa, thẻ quốc tế và ví điện tử (MoMo, ZaloPay).' },
      { heading: 'Tôi quên mang vé thì sao?', body: 'Bạn chỉ cần xuất trình mã vé điện tử trong ứng dụng hoặc email tại quầy soát vé.' },
    ],
  },
  terms: {
    title: 'Điều Khoản Sử Dụng',
    intro: 'Khi sử dụng ThauFilm, bạn đồng ý với các điều khoản dưới đây.',
    sections: [
      { heading: '1. Chấp nhận điều khoản', body: 'Việc truy cập và sử dụng dịch vụ đồng nghĩa với việc bạn đã đọc, hiểu và đồng ý tuân thủ toàn bộ điều khoản này.' },
      { heading: '2. Tài khoản người dùng', body: 'Bạn chịu trách nhiệm bảo mật thông tin đăng nhập và mọi hoạt động phát sinh từ tài khoản của mình.' },
      { heading: '3. Đặt vé và thanh toán', body: 'Mọi giao dịch đặt vé là cam kết mua. Giá vé và ưu đãi có thể thay đổi theo từng thời điểm.' },
      { heading: '4. Quyền sở hữu nội dung', body: 'Toàn bộ nội dung, logo và hình ảnh trên ThauFilm thuộc quyền sở hữu của công ty và được pháp luật bảo hộ.' },
    ],
  },
  privacy: {
    title: 'Chính Sách Bảo Mật',
    intro: 'Chúng tôi cam kết bảo vệ thông tin cá nhân của bạn.',
    sections: [
      { heading: 'Thông tin chúng tôi thu thập', body: 'Họ tên, email, số điện thoại và lịch sử đặt vé nhằm phục vụ giao dịch và chăm sóc khách hàng.' },
      { heading: 'Mục đích sử dụng', body: 'Thông tin được dùng để xử lý đơn hàng, gửi thông báo và cải thiện trải nghiệm dịch vụ.' },
      { heading: 'Bảo mật dữ liệu', body: 'Dữ liệu được mã hóa và lưu trữ an toàn. Chúng tôi không bán hay chia sẻ thông tin cá nhân cho bên thứ ba vì mục đích thương mại.' },
    ],
  },
  refund: {
    title: 'Chính Sách Hoàn Vé',
    intro: 'Quy định về việc hủy và hoàn tiền vé đã đặt.',
    sections: [
      { heading: 'Thời hạn hủy vé', body: 'Bạn có thể hủy vé chậm nhất 60 phút trước giờ chiếu. Sau thời điểm này, vé không thể hủy hoặc hoàn.' },
      { heading: 'Phí hủy vé', body: 'Hủy trước 120 phút: hoàn 100%. Hủy trong khoảng 60–120 phút: hoàn 50%.' },
      { heading: 'Thời gian hoàn tiền', body: 'Tiền hoàn được chuyển về phương thức thanh toán ban đầu trong vòng 3–7 ngày làm việc.' },
    ],
  },
  contact: {
    title: 'Liên Hệ',
    intro: 'Đội ngũ ThauFilm luôn sẵn sàng hỗ trợ bạn.',
    sections: [
      { heading: 'Địa chỉ', body: '3/9 Võ Văn Tấn, P. Xuân Hòa, TP. Hồ Chí Minh.' },
      { heading: 'Hotline', body: '1900 2224 (9:00 - 22:00 hằng ngày).' },
      { heading: 'Email', body: 'support@thaufilm.com' },
    ],
  },
  cookie: {
    title: 'Chính Sách Cookie',
    intro: 'Cách ThauFilm sử dụng cookie để cải thiện trải nghiệm.',
    sections: [
      { heading: 'Cookie là gì?', body: 'Cookie là tệp nhỏ lưu trên trình duyệt giúp ghi nhớ tùy chọn và phiên đăng nhập của bạn.' },
      { heading: 'Chúng tôi dùng cookie để', body: 'Duy trì đăng nhập, ghi nhớ giỏ vé và phân tích lưu lượng truy cập nhằm nâng cao chất lượng dịch vụ.' },
      { heading: 'Quản lý cookie', body: 'Bạn có thể tắt cookie trong cài đặt trình duyệt, tuy nhiên một số tính năng có thể không hoạt động đầy đủ.' },
    ],
  },
};

const InfoPage = ({ contentKey }) => {
  const data = INFO_CONTENT[contentKey] || INFO_CONTENT.faq;

  return (
    <Box sx={{ bgcolor: '#0b0b0b', minHeight: '70vh', py: { xs: 6, md: 9 } }}>
      <Container maxWidth="md">
        <Typography variant="h3" sx={{ fontWeight: 800, color: '#fff', mb: 1.5 }}>
          {data.title}
        </Typography>
        <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.6)', mb: 4 }}>
          {data.intro}
        </Typography>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mb: 4 }} />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {data.sections.map((s) => (
            <Box key={s.heading}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff', mb: 1 }}>
                {s.heading}
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.72)', lineHeight: 1.8 }}>
                {s.body}
              </Typography>
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  );
};

export default InfoPage;
