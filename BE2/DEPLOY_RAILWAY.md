# 🚀 Deploy Backend lên Railway - Hướng dẫn cho Team

## Prerequisites
- Tài khoản [Railway](https://railway.app) (đăng ký free)
- GitHub account để connect repo

---

## Bước 1: Push code lên GitHub (nếu chưa có)

```bash
# Trong thư mục BE2
cd BE2
git init
git add .
git commit -m "Add Railway deployment config"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/film-ticket-backend.git
git push -u origin main
```

## Bước 2: Tạo Project mới trên Railway

1. Truy cập [railway.app](https://railway.app)
2. Login → Click **"New Project"**
3. Chọn **"Deploy from GitHub repo"**
4. Connect GitHub account và chọn repo `film-ticket-backend`
5. Chọn branch `main`

## Bước 3: Cấu hình Environment Variables

Trong Railway Dashboard → Project → Backend Service → **Variables**

Thêm các biến môi trường:

```env
# Database (từ Supabase)
SPRING_DATASOURCE_URL=jdbc:postgresql://aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require&prepareThreshold=0
SPRING_DATASOURCE_USERNAME=postgres.akpmrhikkgvhrcmqgkuf
SPRING_DATASOURCE_PASSWORD=Thauphim0305

# JWT
JWT_SECRET=<generate-random-256bit-key>
JWT_ACCESS_EXPIRATION=86400000
JWT_REFRESH_EXPIRATION=604800000

# Google OAuth (nếu có)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# CORS - THÊM ORIGIN CỦA RAILWAY SAU KHI DEPLOY
CORS_ORIGINS=https://your-backend.up.railway.app,http://localhost:5173

# Email (optional)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password

# AI APIs (optional)
GEMINI_API_KEY=
OPENAI_API_KEY=
```

### Cách tạo JWT_SECRET:
```bash
# Chạy command này để tạo random key
openssl rand -base64 64
```

## Bước 4: Deploy

1. Railway sẽ tự động build từ Dockerfile
2. Đợi build hoàn tất (~3-5 phút lần đầu)
3. Kiểm tra log deploy trong Railway Dashboard

## Bước 5: Cập nhật CORS (Sau khi có URL)

Sau khi deploy thành công, Railway sẽ cấp URL:
```
https://film-ticket-backend.up.railway.app
```

1. Vào Railway → Variables
2. Cập nhật `CORS_ORIGINS`:
```
https://film-ticket-backend.up.railway.app,http://localhost:5173
```
3. Redeploy để áp dụng

## Bước 6: Cập nhật Frontend .env

Trong `frontend/.env`:
```
VITE_API_URL=https://film-ticket-backend.up.railway.app
```

---

## 🆘 Troubleshooting

### Build failed
- Kiểm tra log trong Railway Dashboard
- Đảm bảo Dockerfile không có lỗi syntax

### Database connection failed
- Kiểm tra `SPRING_DATASOURCE_URL` đúng format
- Kiểm tra Supabase credentials còn valid

### CORS errors
- Đảm bảo `CORS_ORIGINS` chứa đúng URL của frontend
- Có thể cần thêm `/` ở cuối hoặc không - thử cả hai

### Health check failed
- Đợi 60 giây cho lần đầu startup
- Kiểm tra log xem có lỗi gì không

---

## 📝 Lưu ý quan trọng

### 1. Không commit credentials
File `.env.example` đã được tạo với placeholder. KHÔNG commit file `.env` thật lên GitHub!

### 2. Database connection pooling
Supabase có giới hạn connection. Đã set `maximum-pool-size=3` trong config.

### 3. Free tier limits
- 500 hours/month
- 1GB RAM
- Sleep after 30 minutes inactivity (Cold start ~30s)

### 4. Realtime across devices
Khi cả team dùng chung backend trên Railway:
- WebSocket sẽ hoạt động realtime giữa các thiết bị
- Không còn vấn đề mỗi dev có backend riêng

---

## 🔄 Update Deployment

Khi có code mới:

```bash
git add .
git commit -m "Your changes"
git push origin main
```

Railway sẽ tự động redeploy.

---

## 🌐 URLs sau khi deploy

| Service | URL |
|---------|-----|
| Backend API | `https://film-ticket-backend.up.railway.app` |
| Swagger Docs | `https://film-ticket-backend.up.railway.app/swagger-ui.html` |
| Health Check | `https://film-ticket-backend.up.railway.app/actuator/health` |
