# ThauFilm payout & mail gateway

Dịch vụ nhỏ chạy trên VPS có IPv4 tĩnh. Railway gọi dịch vụ này để:

- tạo/kiểm tra lệnh chi PayOS (tiền được chi từ tài khoản Bảo Kim đã liên kết);
- gửi email bằng Gmail SMTP.

Các endpoint nghiệp vụ đều yêu cầu chữ ký HMAC và chống phát lại bằng timestamp + nonce.
Chỉ `GET /actuator/health` được dùng để kiểm tra dịch vụ.

## 1. DNS và PayOS

1. Tạo bản ghi `A`: `gateway.thau-film.shop` -> `103.78.2.253`.
2. Trong cấu hình Kênh chi PayOS, thêm `103.78.2.253` vào danh sách IP được phép.
3. Không chuyển webhook thu tiền hiện tại: webhook vẫn trỏ về backend Railway.

## 2. Cài trên Ubuntu VPS

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2 nginx certbot python3-certbot-nginx
sudo systemctl enable --now docker nginx
git clone <URL_REPOSITORY> /opt/thaufilm
cd /opt/thaufilm/payout-mail-gateway
cp .env.example .env.production
openssl rand -hex 64
```

Điền `.env.production`:

```dotenv
GATEWAY_SHARED_SECRET=<chuỗi vừa tạo, dùng giống hệt trên Railway>
PAYOS_PAYOUT_CLIENT_ID=<client id của Kênh chi>
PAYOS_PAYOUT_API_KEY=<api key của Kênh chi>
PAYOS_PAYOUT_CHECKSUM_KEY=<checksum key của Kênh chi>
MAIL_USERNAME=<địa chỉ Gmail>
MAIL_PASSWORD=<Google App Password 16 ký tự, không dùng mật khẩu Gmail thường>
MAIL_FROM=<địa chỉ Gmail giống MAIL_USERNAME>
```

Không commit `.env.production`. Sau đó:

```bash
sudo docker compose up -d --build
curl http://127.0.0.1:8090/actuator/health
sudo systemctl stop nginx
sudo certbot certonly --standalone -d gateway.thau-film.shop
sudo cp nginx/gateway.thau-film.shop.conf /etc/nginx/sites-available/gateway.thau-film.shop
sudo ln -s /etc/nginx/sites-available/gateway.thau-film.shop /etc/nginx/sites-enabled/gateway.thau-film.shop
sudo nginx -t
sudo systemctl start nginx
curl https://gateway.thau-film.shop/actuator/health
```

Firewall tối thiểu:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

Port `8090` chỉ bind vào localhost nên không mở trên firewall.

## 3. Biến Railway

```dotenv
SENSITIVE_GATEWAY_URL=https://gateway.thau-film.shop
SENSITIVE_GATEWAY_SHARED_SECRET=<giống GATEWAY_SHARED_SECRET trên VPS>
MAIL_TRANSPORT=GATEWAY
PAYOS_PAYOUT_ENABLED=true
```

Redeploy backend Railway. Chỉ sau khi kiểm tra payout và email thành công mới xóa
`PAYOS_PAYOUT_CLIENT_ID`, `PAYOS_PAYOUT_API_KEY`, `PAYOS_PAYOUT_CHECKSUM_KEY`,
`MAIL_USERNAME`, `MAIL_PASSWORD` khỏi Railway.

Frontend `thau-film.shop` không cần thêm biến nào cho gateway. Trình duyệt không gọi
gateway trực tiếp; luồng là Frontend -> Railway -> VPS -> PayOS/Gmail.

## 4. Cập nhật gateway

```bash
cd /opt/thaufilm
git pull
cd payout-mail-gateway
sudo docker compose up -d --build
sudo docker compose logs --tail=100 gateway
```

Email chống gửi trùng trong thời gian tiến trình đang chạy bằng `messageId`. PayOS
chống tạo trùng bền vững bằng `x-idempotency-key` lấy từ mã tham chiếu hoàn tiền.
