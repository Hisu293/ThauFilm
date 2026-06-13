# FilmTicket Backend

Đây là backend API cho hệ thống đặt vé phim FilmTicket, được xây dựng bằng Spring Boot. Dự án này xử lý các phần chính gồm: đăng ký, đăng nhập, xác thực JWT, đăng nhập Google, phân quyền theo vai trò và quản lý người dùng.

## Mục tiêu của project

Project này cung cấp các chức năng backend sau:

- Đăng ký tài khoản bằng email và mật khẩu
- Đăng nhập bằng email/mật khẩu
- Đăng nhập bằng Google ID Token
- Sinh access token và refresh token sau khi xác thực thành công
- Bảo vệ API bằng Spring Security
- Phân quyền theo vai trò `ADMIN`, `STAFF`, `MEMBER`
- Cung cấp endpoint mẫu để test phân quyền nhanh bằng Swagger/Postman
- Cung cấp endpoint admin để quản lý role và trạng thái hoạt động của user

## Công nghệ sử dụng

- Java 17
- Spring Boot 3.2.0
- Spring Security
- Spring Data JPA
- PostgreSQL
- JWT (jjwt)
- Google API Client
- Lombok
- Jakarta Validation
- SpringDoc OpenAPI / Swagger UI

## Chức năng chính

### 1. Đăng ký tài khoản

Người dùng gửi `email`, `password`, `fullName`, `phone` đến endpoint đăng ký.

Luồng xử lý:

1. Kiểm tra email đã tồn tại chưa
2. Mã hóa mật khẩu bằng `BCryptPasswordEncoder`
3. Tạo user mới với:
   - `provider = EMAIL`
   - `role = MEMBER`
   - `enabled = true`
4. Trả về access token, refresh token và thông tin user

### 2. Đăng nhập bằng email/mật khẩu

Endpoint đăng nhập sẽ:

1. Tìm user theo email
2. Kiểm tra user có phải tài khoản email/password không
3. So khớp mật khẩu với hash trong database
4. Trả về token và thông tin user

### 3. Đăng nhập bằng Google

Người dùng gửi Google ID Token đến backend.

Luồng xử lý:

1. Verify ID Token bằng Google client
2. Lấy thông tin email, tên, ảnh đại diện
3. Nếu email chưa tồn tại thì tạo user mới
4. User Google mặc định có:
   - `provider = GOOGLE`
   - `role = MEMBER`
   - `enabled = true`
5. Trả về token và thông tin user

### 4. Refresh token

Khi access token hết hạn, client có thể gửi refresh token để lấy access token mới.

### 5. Logout

Refresh token sẽ được đánh dấu là revoked để ngăn sử dụng lại.

## Phân quyền

Project đã bật:

- `@EnableWebSecurity`
- `@EnableMethodSecurity`

Nên có thể dùng `@PreAuthorize` trực tiếp trên controller hoặc service.

### Vai trò hệ thống

- `ADMIN`: toàn quyền quản trị
- `STAFF`: quyền cho nhân sự nội bộ
- `MEMBER`: quyền người dùng bình thường

### Route security hiện tại

#### Public

Không cần đăng nhập:

- `/api/auth/register`
- `/api/auth/login`
- `/api/auth/google`
- `/api/auth/refresh`
- `/api/auth/logout`
- `/swagger-ui/**`
- `/swagger-ui.html`
- `/v3/api-docs/**`

#### Admin

- `/api/admin/**` — chỉ `ADMIN`

#### Staff

- `/api/staff/**` — `STAFF` hoặc `ADMIN`

#### Member

- `/api/member/**` — `MEMBER`, `STAFF`, `ADMIN`
- `/api/users/**` — `MEMBER`, `STAFF`, `ADMIN`

## Các endpoint test phân quyền

### Admin

- `GET /api/admin/ping` — kiểm tra quyền admin
- `GET /api/admin/me` — lấy thông tin user hiện tại
- `GET /api/admin/users` — xem danh sách tất cả user
- `PUT /api/admin/users/{userId}/access` — đổi role hoặc bật/tắt user

Body mẫu cho endpoint quản lý user:

```json
{
  "role": "STAFF",
  "enabled": true
}
```

### Staff

- `GET /api/staff/ping` — kiểm tra quyền staff
- `GET /api/staff/me` — lấy thông tin user hiện tại

### Member

- `GET /api/member/ping` — kiểm tra quyền member
- `GET /api/member/me` — lấy thông tin user hiện tại

## Tài khoản seed để test

Sau khi chạy migration, project sẽ có sẵn 3 tài khoản mẫu:

- `admin@filmticket.com` / `123456`
- `staff@filmticket.com` / `123456`
- `member@filmticket.com` / `123456`

Các tài khoản này được seed để bạn test đăng nhập và phân quyền ngay.

## Cấu trúc dữ liệu user

Entity `User` hiện có các trường chính:

- `id`
- `username`
- `email`
- `password`
- `fullName`
- `phone`
- `avatarUrl`
- `provider` (`EMAIL`, `GOOGLE`)
- `role` (`ADMIN`, `STAFF`, `MEMBER`)
- `enabled`

## Giải thích từng thư mục và nó chạy như thế nào

Phần này giải thích theo kiểu dễ hiểu: khi bạn chạy project thì từng thư mục sẽ tham gia vào luồng xử lý ra sao.

### `src/main/java`

Đây là nơi chứa toàn bộ code Java chính của project. Khi bạn chạy ứng dụng, Spring Boot sẽ quét các class trong đây để tạo bean, đăng ký controller, service, repository và security.

Bên trong có các thư mục con:

#### `config/`

Chứa các class cấu hình của hệ thống.

Ví dụ:

- `SecurityConfig` — cấu hình Spring Security, route nào public, route nào cần đăng nhập, route nào cần `ADMIN`, `STAFF`, `MEMBER`
- `OpenApiConfig` — cấu hình Swagger/OpenAPI

Khi ứng dụng khởi động, các cấu hình này được load đầu tiên để hệ thống biết cách bảo vệ API và hiển thị tài liệu API.

#### `controller/`

Chứa các API endpoint nhận request từ client như Swagger, Postman hoặc frontend.

Ví dụ:

- `AuthController` — xử lý đăng ký, đăng nhập, refresh token, logout
- `AdminController` — quản lý user, đổi role, bật/tắt user
- `StaffController` — endpoint test cho staff
- `MemberController` — endpoint test cho member
- `UserController` — các API liên quan tới user hiện tại

Luồng chạy thường là:

client gửi request -> controller nhận request -> controller gọi service -> service xử lý nghiệp vụ -> trả response về cho client.

#### `service/`

Chứa logic nghiệp vụ chính của hệ thống.

Ví dụ:

- `AuthService` — xử lý đăng ký, login, google login, refresh token, logout
- `UserService` — xử lý thông tin user hiện tại và các thao tác liên quan đến user

Đây là nơi “não” của project. Controller chỉ nhận và trả dữ liệu, còn service quyết định logic xử lý thật sự.

#### `repository/`

Chứa lớp làm việc trực tiếp với database.

Ví dụ:

- `UserRepository`
- `RefreshTokenRepository`

Các repository này kế thừa từ Spring Data JPA, nên bạn không cần tự viết SQL cho mọi thứ. Khi service gọi repository, Spring sẽ tự tạo query phù hợp.

Luồng thường là:

service -> repository -> database

#### `entity/`

Chứa các class ánh xạ với bảng trong database.

Ví dụ:

- `User` — ánh xạ với bảng `users`
- `RefreshToken` — ánh xạ với bảng refresh token

Khi ứng dụng chạy, JPA đọc các entity này để biết cách tạo hoặc cập nhật cấu trúc bảng.

#### `dto/`

Chứa các object dùng để nhận request hoặc trả response.

Ví dụ:

- `LoginRequest`
- `RegisterRequest`
- `AuthResponse`
- `UserResponse`
- `ApiResponse`

DTO giúp tách riêng dữ liệu API với entity database, tránh lộ quá nhiều thông tin không cần thiết.

#### `security/`

Chứa phần liên quan đến xác thực và bảo mật.

Ví dụ:

- `JwtTokenProvider` — tạo và kiểm tra JWT
- `JwtAuthenticationFilter` — đọc token từ request và set authentication
- `CustomUserDetailsService` — load user từ database cho Spring Security
- `GoogleIdTokenVerifier` — verify Google ID Token

Khi client gửi request có token, filter trong thư mục này sẽ kiểm tra token trước khi request đi vào controller.

#### `exception/`

Chứa xử lý lỗi.

Ví dụ:

- `BadRequestException`
- `GlobalExceptionHandler`

Nếu service ném lỗi, handler này sẽ format response lỗi cho dễ đọc thay vì trả stack trace thô.

### `src/main/resources`

Đây là nơi chứa file cấu hình và tài nguyên runtime.

#### `application.properties`

File cấu hình chính của project, chứa:

- port chạy server
- thông tin database
- JWT secret
- cấu hình Google OAuth
- cấu hình Swagger
- CORS

Khi app start, Spring Boot sẽ đọc file này trước để cấu hình môi trường chạy.

#### `db/migration/`

Chứa các file migration database.

Các file ở đây sẽ được chạy theo thứ tự khi ứng dụng khởi động, giúp:

- tạo hoặc thay đổi cấu trúc database
- seed dữ liệu mẫu
- đảm bảo database đồng bộ với code

### `src/test`

Chứa code test tự động nếu bạn viết test cho project.

### `pom.xml`

Đây là file cấu hình Maven của project.

Nó khai báo:

- tên project
- version Java
- thư viện cần dùng
- plugin build

Khi bạn chạy:

```bash
mvn spring-boot:run
```

Maven sẽ:

1. đọc `pom.xml`
2. tải dependencies nếu chưa có
3. biên dịch code trong `src/main/java`
4. đọc cấu hình trong `src/main/resources`
5. khởi động Spring Boot application

Khi bạn chạy:

```bash
mvn clean package
```

Maven sẽ:

1. xóa kết quả build cũ trong `target/`
2. biên dịch lại project
3. đóng gói thành file `.jar`
4. đặt kết quả trong `target/`

### `target/`

Đây là thư mục Maven tự sinh ra sau khi build.

Nó không phải nơi viết code gốc, mà chỉ là nơi chứa kết quả build.

Nói đơn giản:

- `src/` = nơi viết code
- `pom.xml` = bản thiết kế để Maven biết phải build thế nào
- `target/` = sản phẩm sau khi build xong


File cấu hình chính nằm ở:

- `src/main/resources/application.properties`

### Thông tin hiện tại trong project

- Server: `8080`
- Database: PostgreSQL
- Database URL: `jdbc:postgresql://localhost:5432/ThauFilm`
- Username: `postgres`
- Password: `12345`
- Hibernate: `ddl-auto=update`

### Lưu ý Google OAuth

Nếu chưa dùng Google login, bạn có thể để placeholder:

```properties
spring.security.oauth2.client.registration.google.client-id=YOUR_GOOGLE_CLIENT_ID
spring.security.oauth2.client.registration.google.client-secret=YOUR_GOOGLE_CLIENT_SECRET
```

## Maven là gì và thư mục `target/` là gì?

### Maven là gì?

Maven là công cụ quản lý project Java. Nó giúp:

- tải dependencies
- build project
- chạy ứng dụng
- tạo file `.jar` khi đóng gói

Khi bạn thấy lệnh:

```bash
mvn spring-boot:run
```

nghĩa là Maven sẽ build tạm và chạy trực tiếp ứng dụng Spring Boot.

### Thư mục `target/` là gì?

`target/` là thư mục Maven tự tạo ra sau khi build project.

Bên trong `target/` thường có:

- file `.jar` đã được build
- class đã biên dịch
- file tạm trong quá trình đóng gói

Ví dụ:

```bash
mvn clean package
```

sẽ tạo ra file chạy được trong `target/`.

### Có nên sửa file trong `target/` không?

Không nên. Vì:

- đây là thư mục sinh ra tự động
- mỗi lần build lại, nội dung có thể bị ghi đè
- code gốc phải sửa trong `src/`

Nói ngắn gọn:

- `src/` = mã nguồn chính
- `target/` = kết quả build do Maven sinh ra

### Yêu cầu trước khi chạy

- Java 17
- Maven
- PostgreSQL đang chạy
- Database `ThauFilm` đã được tạo

### 1. Chuẩn bị database

Tạo database PostgreSQL nếu chưa có:

```sql
CREATE DATABASE "ThauFilm";
```

### 2. Kiểm tra cấu hình `application.properties`

Đảm bảo thông tin database đúng với máy của bạn:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/ThauFilm
spring.datasource.username=postgres
spring.datasource.password=12345
```

### 3. Chạy ứng dụng

Chạy bằng Maven:

```bash
mvn spring-boot:run
```

Hoặc build rồi chạy jar:

```bash
mvn clean package
java -jar target/*.jar
```

## Swagger UI

Sau khi chạy ứng dụng, mở:

- `http://localhost:8080/swagger-ui/index.html`

Tại Swagger, bạn có thể:

- test đăng nhập
- test endpoint public
- test endpoint admin/staff/member sau khi nhập token

## Ví dụ request

### Đăng ký

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@gmail.com",
  "password": "123456",
  "fullName": "Nguyen Van A",
  "phone": "0123456789"
}
```

### Đăng nhập

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "member@filmticket.com",
  "password": "123456"
}
```

### Lấy thông tin user hiện tại

```http
GET /api/users/me
Authorization: Bearer <access_token>
```

### Admin đổi role user

```http
PUT /api/admin/users/1/access
Authorization: Bearer <admin_access_token>
Content-Type: application/json

{
  "role": "STAFF",
  "enabled": true
}
```

## Cấu trúc thư mục chính

- `config/` — cấu hình bảo mật, Swagger, CORS
- `controller/` — API endpoints
- `service/` — business logic
- `security/` — JWT filter, token provider, user details service
- `entity/` — JPA entity
- `dto/` — request/response models
- `repository/` — lớp truy cập dữ liệu
- `exception/` — custom exception và handler

## Migration database

Project hiện dùng các file migration trong:

- `src/main/resources/db/migration/`

Đang có:

- đổi role cũ sang `MEMBER`
- seed dữ liệu 3 tài khoản test

## Lưu ý cho developer

- Password chỉ áp dụng cho tài khoản `EMAIL`
- Tài khoản `GOOGLE` sẽ đăng nhập qua Google token
- Role mặc định khi đăng ký mới là `MEMBER`
- `enabled` mặc định là `true`
- API trả về theo format `ApiResponse<T>`

## Nếu gặp lỗi thường gặp

### 1. Không kết nối được database

Kiểm tra:

- PostgreSQL đã chạy chưa
- database `ThauFilm` đã tồn tại chưa
- username/password trong `application.properties`

### 2. Login trả về 401

Kiểm tra:

- token có gửi trong header `Authorization: Bearer <token>` không
- token còn hạn không
- user có đang `enabled = true` không

### 3. Swagger không mở được

Kiểm tra ứng dụng đã chạy thành công ở port `8080` chưa.

---

Nếu bạn muốn, mình có thể viết tiếp một bản README ngắn gọn hơn nữa theo kiểu “dành cho người mới chạy project”, hoặc bổ sung luôn phần API chi tiết dạng bảng cho từng endpoint.