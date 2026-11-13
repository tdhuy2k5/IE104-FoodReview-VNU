# Frontend — Food Review Làng Đại học

Frontend tĩnh (HTML + CSS + JavaScript thuần) để thử nghiệm nhanh toàn bộ API của backend. Không cần build, không cần Node.js hay npm.

## Cấu trúc

```
frontend/
├── index.html          # Giao diện chính (SPA một trang)
├── README.md
├── css/
│   └── styles.css      # Toàn bộ style
└── js/
    ├── config.js       # Cấu hình API_BASE_URL và danh sách cổng tự dò
    ├── utils.js        # Helper DOM, format, toast, modal, nhãn enum, ghép URL ảnh
    ├── api.js          # Lớp gọi API, tự dò backend, tự gắn JWT
    ├── auth.js         # Đăng nhập / đăng ký / phiên làm việc
    ├── places.js       # Danh sách, bộ lọc, chi tiết địa điểm
    ├── reviews.js      # Đánh giá, upload ảnh, báo cáo vi phạm
    ├── admin.js        # Bảng điều khiển quản trị
    └── app.js          # Khởi tạo và nối sự kiện
```

## Chạy frontend

### 1. Khởi động backend

**Cách khuyến nghị — Docker Compose** (PostgreSQL 16 + API):

```bash
docker compose up --build
```

API chạy tại `http://localhost:5000`, Swagger: `http://localhost:5000/swagger`.

**Hoặc chạy trực tiếp bằng .NET** (cần PostgreSQL đang chạy):

```bash
cd backend/FoodReview.Api
dotnet run
```

Backend .NET mặc định chạy tại `http://localhost:5114` (xem `Properties/launchSettings.json`). Swagger: `http://localhost:5114/swagger`.

### 2. Chạy static server cho frontend

Cách khuyến nghị (Python có sẵn trên hầu hết máy):

```bash
cd frontend
python -m http.server 5500
```

Mở `http://localhost:5500`.

Hoặc dùng extension **Live Server** trong VS Code: chuột phải `frontend/index.html` → *Open with Live Server*.

> Mở trực tiếp `index.html` bằng `file://` cũng có thể hoạt động nhờ CORS `AllowAll` của backend, nhưng nên dùng HTTP server để tránh khác biệt giữa các trình duyệt.

### 3. Đổi cổng API

Frontend tự dò backend: thử lần lượt `http://<host>:5000` (Docker) rồi `http://<host>:5114` (dotnet) qua `GET /api/Areas`, và dùng cổng phản hồi đầu tiên. Danh sách cổng nằm trong `API_PORTS`. Nếu mất kết nối, frontend không ghi nhớ cổng lỗi mà sẽ dò lại ở lần gọi kế tiếp, nên chỉ cần tải lại trang (hoặc bấm “Thử lại”) sau khi backend khởi động xong.

Nếu backend chạy ở cổng khác, đặt cứng `API_BASE_URL` trong `frontend/js/config.js`:

```js
const CONFIG = {
  API_BASE_URL: 'http://localhost:5000',
  API_PORTS: ['5000', '5114'],
  // ...
};
```

## Tài khoản mẫu

| Vai trò | Email | Mật khẩu |
| --- | --- | --- |
| Admin | `admin@langdaihoc.vn` | `Admin@123` |
| Sinh viên | `sinhvien@uit.edu.vn` | `Student@123` |

Trong modal đăng nhập có nút điền nhanh tài khoản mẫu.

## Chức năng đã nối API

**Công khai**
- Danh sách địa điểm + tìm kiếm, lọc theo khu vực / danh mục / ngân sách / đánh giá, sắp xếp, phân trang — `GET /api/Places`
- Chi tiết địa điểm, thực đơn, đánh giá — `GET /api/Places/{id}`, `GET /api/Reviews/place/{placeId}`
- Danh sách khu vực / danh mục — `GET /api/Areas`, `GET /api/Categories`

**Tài khoản**
- Đăng ký, đăng nhập, lấy hồ sơ — `POST /api/Auth/register`, `POST /api/Auth/login`, `GET /api/Auth/me`
- Lưu token trong `localStorage`, tự gắn `Authorization: Bearer ...`

**Sinh viên (đã đăng nhập)**
- Lưu / bỏ lưu quán yêu thích — `POST /api/Places/{id}/favorite`
- Xem danh sách yêu thích — `GET /api/Favorites`
- Viết đánh giá kèm upload ảnh — `POST /api/Upload`, `POST /api/Reviews/place/{placeId}`
- Xem / xóa đánh giá của mình — `GET /api/Reviews/my`, `DELETE /api/Reviews/{id}`
- Báo cáo đánh giá vi phạm — `POST /api/Reviews/{id}/report`

**Admin**
- Danh sách báo cáo + xử lý / ẩn đánh giá — `GET /api/Admin/reports`, `PUT /api/Admin/reports/{id}/resolve`
- Danh sách người dùng + khóa/mở khóa — `GET /api/Admin/users`, `PUT /api/Admin/users/{id}/toggle-ban`
- Danh sách địa điểm + thêm địa điểm + ẩn địa điểm — `GET /api/Admin/places`, `POST /api/Places`, `DELETE /api/Places/{id}`

## Ghi chú

- Backend tự dò cổng khi khởi động frontend; không cần sửa `config.js` nếu dùng Docker (`:5000`) hoặc `dotnet run` (`:5114`).
- Enum từ backend trả về dạng **số** (`0`, `1`, `2`...), frontend ánh xạ sang nhãn tiếng Việt trong `js/utils.js`.
- Danh mục trong PostgreSQL lưu `Icon` dạng tên (`utensils`, `soup`, `flame`, `coffee`, `pot`, `leaf`); frontend ánh xạ sang emoji trong `js/places.js`.
- Đây là frontend thử nghiệm API, chưa tối ưu cho production (không có router, state management hay bundler).
- File upload được lưu vào `wwwroot/uploads/` của backend (Docker dùng volume `api_uploads`) và phục vụ qua static files; frontend ghép URL tương đối với địa chỉ API đã dò.
