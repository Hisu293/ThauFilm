# ThauFilm - Project Overview

## 1. Tổng quan dự án

ThauFilm là hệ thống đặt vé xem phim full-stack, gồm frontend React và backend Spring Boot. Dự án mô phỏng một nền tảng rạp chiếu phim hiện đại với đầy đủ luồng nghiệp vụ: xem phim, chọn suất chiếu, giữ ghế, thanh toán, sinh vé, quản lý rạp, quản lý phim, quản lý khách hàng, báo cáo doanh thu, social/community và các tính năng gợi ý thông minh.

Hệ thống được thiết kế theo hướng tách biệt frontend/backend:

- Frontend: React + Vite, triển khai được trên Vercel.
- Backend: Spring Boot REST API, triển khai được trên Railway.
- Database: PostgreSQL, đang cấu hình dùng Supabase/Railway-compatible PostgreSQL.
- Migration: Flyway quản lý version schema.
- Authentication: JWT access token/refresh token, Google OAuth.
- Realtime: WebSocket và Server-Sent Events.
- AI/Intelligence: module gợi ý lịch chiếu, heatmap ghế, pricing, leaderboard, movie compatibility.

## 2. Cấu trúc thư mục chính

```text
java_06_team_05_new/
├── BE2/                         # Backend Spring Boot
│   ├── src/main/java/com/filmticket/
│   │   ├── config/              # Security, CORS, OpenAPI, WebSocket, seeding
│   │   ├── controller/          # REST controllers theo từng module
│   │   ├── dto/                 # Request/response DTO
│   │   ├── entity/              # JPA entities mapping database
│   │   ├── exception/           # Global exception handling
│   │   ├── model/               # Enum/domain model phụ trợ
│   │   ├── repository/          # Spring Data JPA repositories
│   │   ├── scheduler/           # Job tự động, ví dụ hủy booking quá hạn
│   │   ├── security/            # JWT filter/provider, user details, Google verifier
│   │   ├── service/             # Business logic
│   │   ├── util/                # QR/PDF ticket generator
│   │   └── websocket/           # WebSocket realtime service
│   ├── src/main/resources/
│   │   ├── application.properties
│   │   └── db/migration/        # Flyway SQL migrations V1 -> V41
│   ├── api-docs/API_DOCS.md
│   ├── Dockerfile
│   ├── pom.xml
│   └── railway.json
│
├── frontend/                    # Frontend React + Vite
│   ├── src/
│   │   ├── admin/               # Admin dashboard sections/components
│   │   ├── api/                 # Axios client cho một số flow
│   │   ├── components/          # UI components dùng lại
│   │   ├── context/             # AuthContext, BookingContext
│   │   ├── hooks/               # Custom hooks
│   │   ├── layouts/             # Public/Auth/Staff layouts
│   │   ├── pages/               # Các page chính
│   │   ├── routes/              # React Router routes
│   │   ├── services/            # API services theo domain
│   │   ├── theme/               # Theme UI
│   │   └── utils/               # Local storage/hash helpers
│   ├── public/                  # Static assets
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── vercel.json
│
└── README.md
```

## 3. Backend architecture

Backend dùng kiến trúc phân lớp rõ ràng:

```text
Controller -> Service -> Repository -> Database
```

- Controller nhận HTTP request, validate input cơ bản và trả response chuẩn.
- Service chứa nghiệp vụ chính: booking, payment, seat holding, admin intelligence, staff reports.
- Repository dùng Spring Data JPA để truy vấn PostgreSQL.
- Entity mapping các bảng chính trong database.
- DTO tách request/response khỏi entity để API ổn định hơn.
- Security filter xử lý JWT trước khi request đi vào controller.
- Scheduler xử lý tác vụ nền như tự động hết hạn ghế đang hold.

Các công nghệ backend chính:

- Java 17.
- Spring Boot 3.2.0.
- Spring Web REST API.
- Spring Security + JWT.
- Spring Data JPA/Hibernate.
- PostgreSQL driver.
- Flyway migration.
- Spring Validation.
- Spring Mail.
- Spring WebSocket.
- Spring Actuator.
- Springdoc OpenAPI/Swagger UI.
- Lombok.
- Google API Client cho Google OAuth.
- OpenPDF + ZXing cho sinh PDF và QR vé.

## 4. Frontend architecture

Frontend là single-page application dùng React và Vite.

Các điểm chính:

- React Router quản lý route public, member, admin, staff.
- Axios client tự gắn `Authorization: Bearer <token>` từ `localStorage`.
- Context API quản lý auth và booking state.
- Component hóa theo domain: booking, movie, admin, staff, social.
- Material UI, Tailwind, CSS module/file riêng cho giao diện.
- Vite build ra thư mục `dist` để deploy lên Vercel.

Một số route chính:

| Route | Chức năng |
|---|---|
| `/` | Trang chủ |
| `/movies` | Danh sách phim |
| `/movies/:id` | Chi tiết phim |
| `/cinemas` | Rạp chiếu |
| `/promotions` | Khuyến mãi |
| `/booking/seats/:showtimeId` | Chọn ghế |
| `/booking/summary` | Xác nhận đặt vé |
| `/booking/payment` | Thanh toán |
| `/booking/success` | Đặt vé thành công |
| `/my-bookings` | Vé của tôi |
| `/admin` | Admin dashboard |
| `/staff/dashboard` | Staff dashboard |
| `/intelligence` | Cinema intelligence/member intelligence |
| `/favorite-lists` | Danh sách phim yêu thích |
| `/community/connections` | Kết nối cộng đồng |
| `/booking/group/:groupId` | Đặt vé nhóm |

## 5. API hoạt động như thế nào

Backend expose API dưới prefix `/api`. Response chuẩn thường có dạng:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

Với API cần đăng nhập, frontend gửi JWT trong header:

```http
Authorization: Bearer <access_token>
```

Luồng gọi API cơ bản:

```text
React page/component
  -> service layer/axiosClient
  -> Spring Controller
  -> Service nghiệp vụ
  -> Repository/JPA
  -> PostgreSQL
  -> trả ApiResponse về frontend
```

## 6. Nhóm API chính

### 6.1 Authentication

Prefix: `/api/auth`

| Method | Endpoint | Chức năng |
|---|---|---|
| POST | `/register` | Đăng ký tài khoản |
| POST | `/login` | Đăng nhập local |
| POST | `/google` | Đăng nhập Google |
| POST | `/refresh` | Cấp lại access token |
| POST | `/logout` | Đăng xuất và vô hiệu refresh token |

Điểm nổi bật:

- JWT stateless authentication.
- Refresh token lưu database.
- Password mã hóa bằng BCrypt.
- Hỗ trợ Google OAuth ID token.

### 6.2 Movies, showtimes, theaters

| Prefix | Chức năng |
|---|---|
| `/api/movies` | Danh sách phim, phim đang chiếu, sắp chiếu, chi tiết phim |
| `/api/showtimes` | Lấy suất chiếu, lọc theo phim/ngày, lấy sơ đồ ghế |
| `/api/theaters` | Lấy danh sách rạp, chi tiết rạp, phòng chiếu theo rạp |

Các API này là nền cho luồng đặt vé: người dùng chọn phim -> chọn rạp/ngày/suất -> chọn ghế.

### 6.3 Booking/payment/ticket

Prefix: `/api/member/booking`

| Method | Endpoint | Chức năng |
|---|---|---|
| GET | `/showtimes/{showtimeId}/seats` | Lấy sơ đồ ghế theo suất chiếu |
| POST | `/` | Tạo booking và hold ghế |
| POST | `/{bookingId}/pay` | Thanh toán và xác nhận booking |
| GET | `/` | Lấy danh sách booking của user |
| GET | `/{bookingId}` | Chi tiết booking |
| GET | `/{bookingId}/tickets` | Lấy vé của booking |
| GET | `/combos` | Lấy combo bắp nước |
| GET | `/discounts` | Lấy mã giảm giá |
| POST | `/{bookingId}/cancel` | Hủy booking |

Luồng nghiệp vụ:

```text
1. User chọn ghế.
2. Backend tạo booking trạng thái HOLD/PENDING.
3. Ghế được khóa tạm thời bằng seat availability/booking seat.
4. User thanh toán trong thời gian giữ ghế.
5. Backend tạo payment, đổi booking sang CONFIRMED.
6. Backend sinh ticket code, QR/PDF ticket.
7. Email vé được gửi sau khi giao dịch commit.
8. Scheduler tự giải phóng booking quá hạn.
```

Điểm kỹ thuật đáng chú ý:

- Có cơ chế hold ghế tránh hai người đặt trùng.
- Có scheduler xử lý booking hết hạn.
- Payment endpoint được xử lý idempotent ở mức nghiệp vụ: nếu booking đã confirmed và payment đã paid thì có thể trả lại kết quả thành công thay vì lỗi trạng thái.
- Email vé chạy async sau transaction commit để không làm chậm response thanh toán.
- Ticket có QR/PDF phục vụ check-in.

### 6.4 Admin APIs

Các prefix chính:

| Prefix | Chức năng |
|---|---|
| `/api/admin` | Dashboard, user management, movie management |
| `/api/admin/theaters` | CRUD rạp |
| `/api/admin/rooms` | CRUD phòng chiếu, seat map, CRUD ghế |
| `/api/admin/showtimes` | CRUD suất chiếu, gợi ý suất |
| `/api/admin/pricing` | Cấu hình giá ghế, combo, override giá theo suất |
| `/api/admin/intelligence` | AI/intelligence cho điều hành rạp |

Admin intelligence gồm:

| Method | Endpoint | Chức năng |
|---|---|---|
| GET | `/seat-heatmap?roomId=...` | Heatmap ghế theo phòng |
| GET | `/pricing` | Gợi ý pricing |
| POST | `/pricing/{showtimeId}/apply` | Áp dụng giá động |
| GET | `/weekly-plan?startDate=yyyy-MM-dd` | Sinh kế hoạch lịch chiếu tuần |
| POST | `/weekly-plan/apply` | Áp dụng toàn bộ kế hoạch lịch chiếu |

Đây là phần thể hiện hướng hiện đại của hệ thống: không chỉ CRUD mà có module hỗ trợ ra quyết định cho vận hành rạp.

### 6.5 Staff APIs

Các prefix chính:

| Prefix | Chức năng |
|---|---|
| `/api/staff/bookings` | Quản lý booking, refund, cancel, regrant access |
| `/api/staff/tickets` | Quản lý vé, check-in, reprint |
| `/api/staff/showtimes` | Quản lý suất chiếu |
| `/api/staff/movies` | Quản lý phim ở mức staff |
| `/api/staff/customers` | Quản lý khách hàng, khóa/mở khóa |
| `/api/staff/promotions` | Quản lý khuyến mãi |
| `/api/staff/reports` | Dashboard, doanh thu, ticket sales, top movies |

Module staff giúp tách quyền vận hành thường ngày khỏi quyền admin toàn hệ thống.

### 6.6 Social/community APIs

| Prefix | Chức năng |
|---|---|
| `/api/movies/{movieId}/reviews` | Đánh giá phim, summary, eligibility, AI summary |
| `/api/movies/{movieId}/comments` | Bình luận phim |
| `/api/users/{userId}/follow` | Follow/unfollow, follower/following |
| `/api/favorite-lists` | Danh sách phim yêu thích, public share |
| `/api/member/matching` | Movie matching, candidate, message, invitation, block/report |
| `/api/member/group-bookings` | Đặt vé nhóm |

Các tính năng này làm dự án giống một nền tảng phim có cộng đồng, không chỉ là app bán vé.

## 7. Realtime

Dự án có hai hướng realtime:

### Server-Sent Events

Endpoint:

```http
GET /api/events/movies
```

Dùng cho stream update liên quan đến phim.

### WebSocket

Endpoint:

```text
/ws
```

Backend có:

- `WebSocketConfig`
- `RealtimeWebSocketHandler`
- `WebSocketAuthInterceptor`
- `RealtimeEventService`

WebSocket phù hợp cho các tình huống cần realtime hai chiều như booking nhóm, cập nhật trạng thái ghế, thông báo realtime.

## 8. Security và phân quyền

Backend dùng Spring Security theo mô hình stateless:

- Tắt session server-side: `SessionCreationPolicy.STATELESS`.
- JWT filter chạy trước `UsernamePasswordAuthenticationFilter`.
- Role-based access:
  - `MEMBER`
  - `STAFF`
  - `ADMIN`
- Public endpoints được permit rõ ràng: auth, movies GET, showtimes, Swagger/OpenAPI.
- Admin endpoint chỉ cho `ADMIN`.
- Staff endpoint cho `STAFF` hoặc `ADMIN`.
- Member endpoint cho user đã đăng nhập.
- CORS cấu hình qua biến môi trường `CORS_ORIGINS`.

## 9. Database

Database chính là PostgreSQL. Schema được quản lý bằng Flyway migrations trong:

```text
BE2/src/main/resources/db/migration/
```

Dự án hiện có nhiều migration từ V1 đến V41, thể hiện schema được phát triển theo version rõ ràng.

### 9.1 Các nhóm bảng chính

| Nhóm | Bảng tiêu biểu | Ý nghĩa |
|---|---|---|
| Auth/User | `users`, `refresh_tokens` | Tài khoản, role, token |
| Movie | `movies` | Thông tin phim |
| Cinema | `theaters`, `cinema_room`, `seat` | Rạp, phòng, ghế |
| Showtime | `showtime`, `seat_availabilities` | Suất chiếu và trạng thái ghế theo suất |
| Booking | `bookings`, `booking_seats`, `payments`, `tickets` | Đặt vé, thanh toán, vé |
| Pricing | `seat_type_price_configs`, `showtime_price_overrides`, `combos` | Giá động, combo |
| Discount | `discounts`, `discount_usages` | Mã giảm giá và lịch sử dùng |
| Social | `reviews`, `comments`, `follows`, `favorite_lists`, `favorite_list_items` | Cộng đồng phim |
| Matching | `movie_matching_profiles`, `movie_matching_actions`, `movie_matches`, `movie_match_messages`, `movie_match_invitations`, `movie_matching_blocks`, `movie_matching_reports` | Ghép cặp/kết nối theo sở thích phim |
| Group booking | `group_bookings`, `group_booking_members` | Đặt vé nhóm |

### 9.2 Điểm nổi bật của database

Database không chỉ lưu CRUD cơ bản mà có nhiều điểm thiết kế tốt:

- Dùng UUID cho khóa chính, phù hợp hệ thống phân tán/deploy cloud.
- Flyway versioned migrations giúp schema có lịch sử rõ ràng, dễ deploy nhiều môi trường.
- Có index cho các truy vấn quan trọng:
  - booking theo user, showtime, status, hold expiration.
  - ticket theo booking, seat, ticket code.
  - payment theo booking, status, transaction.
  - showtime theo movie, room, start time, status.
  - seat availability theo showtime, seat, available.
  - social/matching theo user, movie, match, status.
- Có unique constraints để bảo vệ dữ liệu:
  - email user unique.
  - booking confirmation code unique.
  - ticket code unique.
  - payment transaction unique.
  - seat trong cùng phòng unique theo `room + row + number`.
  - seat availability unique theo `showtime + seat`.
  - showtime unique theo `room + start_time`.
  - review unique theo `user + movie`.
  - follow unique theo `follower + following`.
  - favorite list item unique theo `list + movie`.
  - group booking member/seat unique.
- Có bảng `seat_availabilities` riêng cho từng suất chiếu, giúp quản lý trạng thái ghế độc lập theo từng showtime.
- Có bảng override giá theo suất chiếu, hỗ trợ dynamic pricing.
- Có bảng matching/social riêng, mở rộng dự án theo hướng cộng đồng.

## 10. AI/Intelligence features

Dự án có module intelligence ở cả admin và member.

Admin intelligence:

- Gợi ý lịch chiếu tuần.
- Seat heatmap.
- Gợi ý giá vé/dynamic pricing.
- Áp dụng giá động vào showtime.
- Tối ưu vận hành rạp dựa trên dữ liệu movie/showtime/room/seat.

Member intelligence:

- Leaderboard.
- Achievement.
- Movie compatibility/dating.

AI service/config:

- Có cấu hình Gemini:
  - `GEMINI_API_KEY`
  - `GEMINI_MODEL`
- Có cấu hình OpenAI-compatible API:
  - `OPENAI_API_KEY`
  - `OPENAI_MODEL`
  - `OPENAI_BASE_URL`
- Có service `AiReviewSummaryService` cho hướng tóm tắt review bằng AI.

Đây là điểm nổi bật khi trình bày dự án: hệ thống không dừng ở bán vé mà có lớp hỗ trợ phân tích, gợi ý và tự động hóa vận hành.

## 11. Ticket, QR và email

Backend có tiện ích:

- `TicketQrGenerator`: sinh QR cho vé.
- `TicketPdfGenerator`: sinh file PDF vé.
- Spring Mail: gửi email vé.
- Async event sau khi booking confirmed: gửi email sau khi transaction đã commit.

Luồng này giúp trải nghiệm giống hệ thống bán vé thật: sau thanh toán, người dùng nhận mã vé/QR để check-in.

## 12. Scheduler/background jobs

Backend có scheduler `BookingExpiredScheduler` để xử lý booking giữ ghế quá hạn.

Vai trò:

- Tự động tìm booking chưa thanh toán đã hết hạn.
- Giải phóng ghế.
- Tránh ghế bị khóa vĩnh viễn.
- Đảm bảo dữ liệu ghế phản ánh đúng trạng thái thực tế.

Hệ thống dùng timezone `Asia/Ho_Chi_Minh` để tránh lệch ngày/giờ khi deploy cloud.

## 13. Deploy/cloud readiness

### Backend

Backend có:

- `Dockerfile`
- `railway.json`
- Actuator health check:
  - `/actuator/health`
  - `/actuator/info`
- Biến môi trường cho database, JWT, CORS, mail, AI keys.

Phù hợp deploy Railway hoặc nền tảng container/cloud tương tự.

### Frontend

Frontend có:

- Vite build command: `npm run build`.
- Output directory: `dist`.
- `vercel.json` rewrite toàn bộ route về `index.html`, cần thiết cho React Router khi refresh trang.
- Biến môi trường:

```env
VITE_API_URL=https://<backend-domain>
```

Phù hợp deploy Vercel.

## 14. Modern tech highlights

Các điểm có thể nhấn mạnh khi thuyết trình/báo cáo:

- Full-stack SPA + REST API tách biệt rõ ràng.
- Java 17 + Spring Boot 3, stack backend hiện đại.
- PostgreSQL cloud database.
- Flyway database migration chuyên nghiệp.
- JWT stateless authentication.
- Refresh token flow.
- Role-based authorization: Member/Staff/Admin.
- Google OAuth login.
- React + Vite build nhanh.
- Material UI/Tailwind cho UI hiện đại.
- Axios interceptor tự động gắn token và chuẩn hóa lỗi.
- WebSocket cho realtime.
- SSE cho event stream.
- Booking hold mechanism tránh tranh chấp ghế.
- Scheduler tự động release booking hết hạn.
- QR/PDF ticket generation.
- Async email sau transaction commit.
- Dynamic pricing/seat price override.
- Admin intelligence cho gợi ý lịch chiếu và heatmap.
- Social/community module: review, comment, follow, favorite list.
- Movie matching và group booking.
- Staff dashboard/reporting.
- OpenAPI/Swagger documentation.
- Actuator health check cho production.
- Docker/Railway/Vercel deployment-ready.

## 15. Luồng nghiệp vụ nổi bật

### Luồng đặt vé

```text
User đăng nhập
  -> chọn phim
  -> chọn rạp/ngày/suất
  -> xem seat map
  -> chọn ghế
  -> backend hold ghế
  -> xác nhận booking
  -> thanh toán
  -> sinh payment + ticket
  -> gửi email vé
  -> staff check-in bằng mã vé/QR
```

### Luồng admin tạo lịch chiếu thông minh

```text
Admin mở trung tâm điều hành
  -> chọn tuần
  -> backend sinh weekly plan
  -> admin xem danh sách suất đề xuất
  -> apply plan
  -> backend tạo showtime và seat availability
  -> lịch chiếu xuất hiện cho user đặt vé
```

### Luồng social/movie matching

```text
User tạo/cập nhật profile matching
  -> xem candidate phù hợp
  -> action với candidate
  -> match nếu hai bên phù hợp
  -> nhắn tin/gửi invitation xem phim
  -> có thể block/report khi cần
```

## 16. Các biến môi trường quan trọng

Backend:

```env
DB_URL=
DB_USER=
DB_PASS=
JWT_SECRET=
JWT_ACCESS_EXPIRATION=
JWT_REFRESH_EXPIRATION=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
CORS_ORIGINS=
GEMINI_API_KEY=
GEMINI_MODEL=
OPENAI_API_KEY=
OPENAI_MODEL=
OPENAI_BASE_URL=
MAIL_HOST=
MAIL_PORT=
MAIL_USERNAME=
MAIL_PASSWORD=
```

Frontend:

```env
VITE_API_URL=
```

## 17. Cách chạy local

### Backend

Yêu cầu:

- JDK 17.
- Maven.
- PostgreSQL hoặc database cloud PostgreSQL.

Chạy:

```bash
cd BE2
mvn spring-boot:run
```

API local:

```text
http://localhost:8080/api
```

Swagger/OpenAPI:

```text
http://localhost:8080/swagger-ui/index.html
```

### Frontend

Yêu cầu:

- Node.js.
- npm.

Chạy:

```bash
cd frontend
npm install
npm run dev
```

Frontend local:

```text
http://localhost:5173
```

## 18. Kết luận

ThauFilm là một dự án full-stack có phạm vi lớn hơn một app CRUD thông thường. Điểm mạnh nằm ở việc kết hợp đầy đủ các module của một hệ thống rạp chiếu phim thật: authentication, booking, seat holding, payment, ticket QR/PDF, admin/staff dashboard, pricing, promotion, report, social/community, realtime và AI/intelligence.

Về mặt kỹ thuật, dự án thể hiện nhiều thực hành hiện đại: Spring Boot 3, Java 17, PostgreSQL, Flyway, JWT, WebSocket, SSE, OpenAPI, React/Vite, cloud deployment, async processing và database indexing/constraints cho nghiệp vụ đặt vé.
