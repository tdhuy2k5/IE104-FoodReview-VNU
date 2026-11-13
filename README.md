# Food Review - Làng Đại học (ĐHQG TP.HCM)

> **Đồ án môn học:** IE104 - Thiết kế Giao diện Người dùng  
> **Chủ đề:** Website Review & Khám phá địa điểm ăn uống quanh Làng Đại học (ĐHQG-HCM)

---

## Giới thiệu Dự án

**Food Review - Làng Đại học** là nền tảng thông tin và cộng đồng đánh giá địa điểm ăn uống dành riêng cho sinh viên và cư dân tại khu vực Làng Đại học Quốc gia TP.HCM.

Hệ thống tập trung giải quyết 3 câu hỏi thiết thực:
1. *Ăn ở đâu?* (Tìm theo khu vực KTX A, KTX B, Chợ Đêm, Dốc Quốc Tế...)
2. *Giá khoảng bao nhiêu?* (Lọc theo ngân sách sinh viên)
3. *Người trải nghiệm trước nhận xét thế nào?* (Đánh giá thực tế kèm hình ảnh món ăn)

---

## Kiến trúc Công nghệ (Backend)

- **Platform:** .NET 9 SDK (C# 13)
- **Framework:** ASP.NET Core Web API
- **Data Access Layer:** Dapper Micro-ORM (Raw SQL & Dynamic Parameters)
- **Database Engine:** PostgreSQL 16
- **Containerization:** Docker & Docker Compose
- **Bảo mật & Phân quyền:** JWT Bearer Authentication, BCrypt Password Hashing, Role-Based Access Control (Admin, User)
- **Tài liệu API:** Swagger / OpenAPI UI (`/swagger`)

---

## Cấu trúc Thư mục

```
IE104-FoodReview-VNU/
├── docs/                                  # Tài liệu kiến trúc & đặc tả
│   ├── prd.md                             # Yêu cầu sản phẩm (PRD)
│   ├── ARCHITECTURE-SPINE.md              # Thiết kế kiến trúc & ERD
│   ├── DATA_COLLECTION_GUIDE.md           # Hướng dẫn thu thập dữ liệu & hình ảnh
│   └── schema.sql                         # PostgreSQL Single Source of Truth DDL
├── backend/                               # Mã nguồn Backend
│   └── FoodReview.Api/                    # ASP.NET Core 9 Web API
│       ├── Controllers/                   # RESTful API Endpoints
│       ├── Models/                        # Domain Entities
│       ├── DTOs/                          # Request / Response Models
│       ├── Services/                      # Business Logic (Dapper)
│       ├── Data/                          # Connection Factory & Seed Data
│       ├── Dockerfile                     # Multi-stage Docker build
│       └── Program.cs                     # Startup Pipeline
├── frontend/                              # Frontend thử nghiệm API (HTML/CSS/JS thuần)
│   ├── index.html
│   ├── css/styles.css
│   ├── js/                                # config, api, auth, places, reviews, admin
│   └── README.md                          # Hướng dẫn chạy & danh sách API đã nối
├── docker-compose.yml                     # Cấu hình container API + PostgreSQL
├── .dockerignore
├── GEMINI.md                              # Quy chuẩn pair-programming
└── README.md
```

---

## Hướng dẫn Cài đặt & Khởi chạy

### Cách 1: Chạy bằng Docker Compose (Khuyên dùng)

Yêu cầu máy đã cài đặt và bật [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
# Khởi chạy toàn bộ hệ thống (PostgreSQL 16 + Web API)
docker compose up --build
```

- **Swagger UI:** `http://localhost:5000/swagger`
- **PostgreSQL Server:** `localhost:5432` (Database: `foodreview`, User: `foodreview_user`)

Tài khoản thử nghiệm sẵn có:
- **Admin:** `admin@langdaihoc.vn` / `Admin@123`
- **Sinh viên:** `sinhvien@uit.edu.vn` / `Student@123`

---

## 🖥️ Frontend thử nghiệm API

Thư mục `frontend/` chứa giao diện HTML + CSS + JavaScript thuần (không cần build) để thử toàn bộ API: đăng nhập, khám phá/lọc quán, chi tiết, yêu thích, đánh giá kèm upload ảnh và bảng quản trị.

```bash
# Cách A — chạy backend bằng Docker (PostgreSQL + API, cổng 5000)
docker compose up --build

# Cách B — chạy backend trực tiếp bằng .NET (cổng 5114, cần PostgreSQL)
cd backend/FoodReview.Api
dotnet run

# Terminal khác — static server cho frontend
cd frontend
python -m http.server 5500
```

Mở 👉 **`http://localhost:5500`**. Frontend tự dò backend giữa Docker (`http://localhost:5000`) và `dotnet run` (`http://localhost:5114`), nên không cần sửa cấu hình. Nếu backend chạy ở cổng khác, đặt `API_BASE_URL` trong `frontend/js/config.js` hoặc thêm cổng vào `API_PORTS`.

Chi tiết cấu trúc và danh sách endpoint đã nối: [`frontend/README.md`](frontend/README.md).
Lệnh dừng container:
```bash
docker compose down
```

---

### Dữ liệu mẫu (Seed Data)

Hệ thống tự động nạp sẵn dữ liệu ban đầu khi khởi chạy:

- **Tài khoản kiểm thử:**
  - Quản trị viên (Admin): `admin@langdaihoc.vn` / Mật khẩu: `Admin@123`
  - Sinh viên 1 (User): `sinhvien@uit.edu.vn` / Mật khẩu: `Student@123`
  - Sinh viên 2 (User): `thuytien@hcmus.edu.vn` / Mật khẩu: `Student@123`
- **Khu vực ẩm thực:** KTX Khu A, KTX Khu B, Chợ Đêm ĐHQG, Dốc ĐH Quốc Tế, Vành đai ĐHQG, Tân Lập.
- **Danh mục món ăn:** Cơm Trưa / Cơm Tấm, Bún / Phở / Mì, Ăn Vặt & Xiên Nướng, Trà Sữa & Cà Phê, Lẩu & Nướng, Món Chay.
- **Quán ăn mẫu:** Cơm Tấm Cây Bàng (KTX Khu B) và Bún Bò Huế O Oanh (KTX Khu A) kèm thực đơn và đánh giá mẫu.
