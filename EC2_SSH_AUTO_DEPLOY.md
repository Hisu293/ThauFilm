# Auto deploy frontend từ nhánh `develop` lên EC2 bằng SSH

Workflow trong project thực hiện quy trình sau:

```text
Commit hoặc merge vào develop
        -> GitHub Actions tạo source ZIP
        -> SCP file ZIP lên EC2
        -> SSH vào EC2
        -> Giải nén thành một release mới
        -> Chỉ build và recreate container frontend
```

Workflow nằm tại `.github/workflows/deploy-develop.yml`. Một merge vào
`develop` cũng tạo sự kiện `push`, vì vậy không cần cấu hình thêm sự kiện
`pull_request`.

Workflow không rebuild hoặc restart `backend` và `database`. Hai service này
phải đang chạy sẵn trên EC2; workflow sẽ dừng với thông báo rõ ràng nếu thiếu
một trong hai service.

## 1. Chuẩn bị EC2

Các lệnh dưới đây giả định EC2 dùng Amazon Linux 2023 và user SSH là
`ec2-user`.

### 1.1. Cài Docker, Docker Compose và unzip

Docker Engine, Docker Compose v2 và Buildx cần được cài đặt trước. Có thể dùng
phần cài đặt trong `guildline.build`, sau đó cài thêm `unzip`:

```bash
sudo dnf install -y unzip
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user
```

Thoát SSH rồi đăng nhập lại để quyền thuộc nhóm `docker` có hiệu lực. Kiểm tra:

```bash
docker --version
docker compose version
docker buildx version
unzip -v
docker info
```

Lệnh deploy sử dụng tùy chọn `docker compose up --wait`, vì vậy cần một phiên
bản Docker Compose v2 tương đối mới.

### 1.2. Tạo thư mục deploy

Chạy một lần trên EC2:

```bash
sudo install -d -m 0755 -o ec2-user -g ec2-user \
  /opt/thaufilm \
  /opt/thaufilm/releases \
  /opt/thaufilm/shared
```

Mỗi commit được giải nén vào:

```text
/opt/thaufilm/releases/<commit-sha>
```

Sau khi deploy thành công, symlink sau trỏ tới release hiện tại:

```text
/opt/thaufilm/current
```

### 1.3. Cấu hình `.env` trên EC2 nếu cần

Không lưu `.env` production trong GitHub hoặc trong source ZIP. Với workflow
frontend-only, file này là tùy chọn: nếu không tồn tại, Docker Compose sử dụng
giá trị mặc định. Tạo file khi cần đổi `FRONTEND_PORT`,
`VITE_GOOGLE_CLIENT_ID` thông qua `GOOGLE_CLIENT_ID`, hoặc giữ cấu hình dùng
chung với stack hiện tại.

```bash
cp /path/to/project/.env.example /opt/thaufilm/shared/.env
chmod 600 /opt/thaufilm/shared/.env
```

Nếu chưa có source trên EC2, tạo file trực tiếp:

```bash
vi /opt/thaufilm/shared/.env
chmod 600 /opt/thaufilm/shared/.env
```

Ít nhất cần đổi password database và JWT secret. Khi chỉ public frontend, nên
giới hạn database và backend về localhost:

```dotenv
FRONTEND_PORT=80
BACKEND_BIND_ADDRESS=127.0.0.1
POSTGRES_BIND_ADDRESS=127.0.0.1

POSTGRES_DB=thaufilm
POSTGRES_USER=thaufilm
POSTGRES_PASSWORD=replace-with-a-strong-password
JWT_SECRET=replace-with-at-least-32-random-characters

FRONTEND_URL=http://EC2_PUBLIC_IP_OR_DOMAIN
BACKEND_URL=http://EC2_PUBLIC_IP_OR_DOMAIN
CORS_ORIGINS=http://EC2_PUBLIC_IP_OR_DOMAIN
```

Điền thêm Google, email, Cloudinary, PayOS, AI hoặc AWS S3 credentials nếu môi
trường EC2 sử dụng các tính năng đó.

## 2. Tạo SSH key riêng cho GitHub Actions

Không dùng chung key cá nhân hoặc AWS key pair đang sử dụng hằng ngày. Tạo một
deploy key riêng trên máy quản trị:

```bash
ssh-keygen \
  -t ed25519 \
  -C "github-actions-thaufilm-develop" \
  -f ./thaufilm-github-actions \
  -N ""
```

Hai file được tạo:

```text
thaufilm-github-actions       # private key
thaufilm-github-actions.pub   # public key
```

Thêm public key vào EC2:

```bash
cat thaufilm-github-actions.pub
```

Copy kết quả, SSH vào EC2 và thêm vào cuối file:

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
vi ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Kiểm tra key mới trước khi cấu hình GitHub:

```bash
ssh \
  -o IdentitiesOnly=yes \
  -i ./thaufilm-github-actions \
  ec2-user@EC2_PUBLIC_IP_OR_DOMAIN
```

## 3. Lấy SSH known-host entry

GitHub Actions bật `StrictHostKeyChecking=yes`, do đó cần lưu public host key
của EC2. Từ một máy đáng tin cậy:

```bash
ssh-keyscan -H -t ed25519 EC2_PUBLIC_IP_OR_DOMAIN
```

Trên EC2, kiểm tra fingerprint thật:

```bash
sudo ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
```

Đảm bảo fingerprint khớp trước khi sử dụng kết quả `ssh-keyscan`.

Nếu SSH dùng port khác `22`:

```bash
ssh-keyscan -p SSH_PORT -H -t ed25519 EC2_PUBLIC_IP_OR_DOMAIN
```

## 4. Cấu hình GitHub Environment

Trong GitHub repository, mở:

```text
Settings -> Environments -> New environment
```

Tạo environment tên:

```text
develop
```

Trong `Environment variables`, thêm:

| Tên | Ví dụ |
|---|---|
| `EC2_HOST` | `ec2-xx-xx-xx-xx.ap-southeast-1.compute.amazonaws.com` |
| `EC2_USER` | `ec2-user` |
| `EC2_SSH_PORT` | `22` |

Trong `Environment secrets`, thêm:

| Tên | Giá trị |
|---|---|
| `EC2_SSH_PRIVATE_KEY` | Toàn bộ nội dung file `thaufilm-github-actions` |
| `EC2_KNOWN_HOSTS` | Toàn bộ dòng kết quả đã xác minh từ `ssh-keyscan` |

Không thêm dấu nháy quanh nội dung private key.

Nếu gói GitHub đang dùng không hỗ trợ Environment secrets cho private
repository, tạo cùng các tên trên tại:

```text
Settings -> Secrets and variables -> Actions
```

Workflow cũng đọc được repository variables và repository secrets.

## 5. Cấu hình EC2 Security Group

Inbound rules tối thiểu:

| Port | Mục đích |
|---|---|
| `22` | GitHub Actions kết nối SSH |
| `80` | Frontend HTTP |
| `443` | HTTPS nếu có reverse proxy hoặc load balancer |

GitHub-hosted runner không có một IP cố định riêng cho repository. Không nên mở
SSH `0.0.0.0/0` lâu dài. Các lựa chọn an toàn hơn gồm:

- self-hosted runner có IP cố định;
- VPN/overlay network;
- workflow tạm thêm IP runner vào Security Group bằng AWS OIDC rồi xóa sau;
- chuyển sang AWS Systems Manager để không cần mở port SSH.

Nếu vẫn public port `22`, bắt buộc tắt password login, tắt root login và chỉ
cho phép key authentication.

Không mở public port PostgreSQL `5433`. Backend `8080` cũng không cần public
khi request được frontend Nginx proxy qua `/api`.

## 6. Chạy deploy

Workflow tự chạy trong hai trường hợp:

- commit được push trực tiếp vào `develop`;
- pull request được merge vào `develop`.

Cũng có thể chạy thủ công:

```text
GitHub -> Actions -> Deploy develop to EC2 -> Run workflow
```

Theo dõi log trong tab Actions. Deploy chỉ được đánh dấu thành công khi
`database` và `backend` đang chạy sẵn, sau đó container `frontend` mới đạt
trạng thái running/healthy trong tối đa 300 giây.

## 7. Kiểm tra trên EC2

```bash
cd /opt/thaufilm/current
docker compose ps
docker compose logs --tail=200 backend
docker compose logs --tail=200 frontend
```

Kiểm tra HTTP:

```bash
curl -I http://127.0.0.1
curl http://127.0.0.1:8080/actuator/health
```

Do backend được bind vào `127.0.0.1`, lệnh health check cần chạy trực tiếp trên
EC2.

## 8. Rollback thủ công

Liệt kê các release đã deploy:

```bash
ls -1 /opt/thaufilm/releases
```

Chọn commit SHA cũ rồi chạy:

```bash
OLD_RELEASE=replace-with-old-commit-sha
cd "/opt/thaufilm/releases/${OLD_RELEASE}"
docker compose build frontend
docker compose up -d --no-deps --wait --wait-timeout 300 frontend
ln -sfn "/opt/thaufilm/releases/${OLD_RELEASE}" /opt/thaufilm/current.next
mv -Tf /opt/thaufilm/current.next /opt/thaufilm/current
```

Không chạy `docker compose down -v`: tùy chọn `-v` sẽ xóa volume PostgreSQL.

## 9. File không được đưa vào source ZIP

Workflow dùng `git archive`, nên chỉ đóng gói file đã được Git theo dõi. File
`.gitattributes` bổ sung `export-ignore` cho:

- toàn bộ file bắt đầu bằng `.env`, bao gồm các file `.env.*`;
- `*.pem`;
- `*.key`;
- `backups`;
- `frontend/node_modules`;
- `frontend/dist`;
- `backend/target`.

Workflow còn kiểm tra lại nội dung ZIP và dừng deploy nếu phát hiện file bắt
đầu bằng `.env`, file PEM hoặc private key.
