# Food Review — Làng Đại học

> Đồ án môn IE104 — Internet và Công nghệ Web, Trường Đại học Công nghệ Thông tin, ĐHQG-HCM.

Nền tảng khám phá và đánh giá quán ăn quanh Làng Đại học. Người dùng có thể lọc quán theo khu vực, loại món và khoảng giá; xem thông tin, đánh giá và chỉ đường; trợ lý AI hỗ trợ tìm quán bằng câu hỏi tự nhiên dựa trên dữ liệu của dự án.

## Công nghệ và kiến trúc

- **Frontend:** React 19, TypeScript, Vite; SPA gọi REST API qua `/api`.
- **Backend:** ASP.NET Core 9 Web API, Dapper, JWT; Swagger tại `/swagger` khi chạy môi trường Development.
- **Database:** PostgreSQL 16 với pgvector; schema nguồn ở `docs/schema.sql`, được áp dụng khi API khởi động.
- **AI/RAG:** Gemini API tạo embedding và câu trả lời; tìm kiếm vector quán/review trong PostgreSQL rồi đưa ngữ cảnh truy xuất vào câu trả lời.
- **Bản đồ:** lưu `Latitude` và `Longitude` trên bản ghi quán; backend tính khoảng cách Haversine khi có vị trí người dùng và tạo Google Maps directions URL. Website có thể bật bản đồ nhúng tùy chọn bằng Maps Embed API key.
- **Triển khai phát triển:** Docker Compose chạy PostgreSQL và API; Vite chạy frontend độc lập.

Luồng chatbot: câu hỏi (và tùy chọn tọa độ do người dùng chủ động chia sẻ) → embedding Gemini → truy xuất pgvector và review công khai → Gemini sinh câu trả lời theo ngữ cảnh → giao diện hiển thị gợi ý quán, giá, điểm, review nổi bật, khoảng cách và link chỉ đường. Nếu chưa có Gemini API key, API chuyển sang tìm kiếm từ khóa cơ bản; tính năng tìm đường bằng link vẫn hoạt động từ tọa độ đã lưu.

## Bố cục repository

```text
backend/FoodReview.Api/   ASP.NET Core API, controllers, DTOs, services, schema.sql
frontend/                 React + TypeScript SPA
docs/schema.sql           PostgreSQL schema, seed/migration-safe DDL và pgvector tables
docs/                     Đặc tả, kiến trúc, hướng dẫn thu thập dữ liệu
docker-compose.yml        PostgreSQL + API
```

## Chạy dự án

### 1. API và PostgreSQL

Cần Docker Desktop đang chạy. Mỗi thành viên muốn bật chatbot Gemini cần tự tạo API key trong Google AI Studio. Key không nằm trong Git; không gửi key riêng của bạn cho nhóm và không commit file `.env`.

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
notepad .env
```

Trong `.env`, điền key của bạn vào biến `GEMINI_API_KEY`, lưu file, rồi chạy tại thư mục gốc:

```powershell
docker compose up --build -d
```

- API/Swagger: `http://localhost:5000/swagger`
- PostgreSQL: `localhost:5432` (database `foodreview`)

Nếu không đặt `GEMINI_API_KEY`, API vẫn chạy và chatbot dùng tìm kiếm từ khóa dự phòng. Khi có key, API tự đồng bộ embedding cho dữ liệu quán/review còn thiếu hoặc chưa dùng embedding model hiện tại lúc khởi động. Endpoint quản trị `POST /api/chat/sync` cũng có thể dùng để đồng bộ thủ công.

### 2. Frontend React

```powershell
cd frontend
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
notepad .env.local
npm.cmd ci
npm.cmd run dev
```

Trong `frontend/.env.local`, đặt `API_PROXY_TARGET=http://localhost:5000` để frontend gửi yêu cầu đến API chạy bằng Docker. Mở địa chỉ Vite in trong terminal (mặc định `http://127.0.0.1:5173`). Nếu API chạy bằng `dotnet run` thay vì Docker, dùng `http://localhost:5114`. Sau khi sửa file môi trường, khởi động lại Vite.

Khi API khởi động với Gemini key, backend tự đồng bộ embedding cho quán và đánh giá có trong database. Nếu chưa có key, API vẫn chạy với tìm kiếm từ khóa dự phòng; link Google Maps không cần Gemini key. Không đặt Gemini key trong `frontend/.env.local` hoặc bất kỳ biến `VITE_*` nào.

### Bản đồ nhúng (tùy chọn)

Link mở/chỉ đường Google Maps dùng tọa độ của quán và không cần Maps API key. Để hiện bản đồ nhúng ở trang chi tiết, bật **Maps Embed API**, tạo key riêng, giới hạn key cho Maps Embed API và website/referrer của frontend, rồi đặt `VITE_GOOGLE_MAPS_EMBED_API_KEY` trong `frontend/.env.local`. Đây là key công khai phía trình duyệt nên phải áp dụng giới hạn; không dùng Gemini key ở frontend.

## Dữ liệu và RAG

- `Places.Latitude` / `Places.Longitude` là tọa độ quán, không phải trường URL Google Maps. Link được tạo từ tọa độ khi trả DTO.
- `PlaceEmbeddings` và `ReviewEmbeddings` lưu nội dung truy xuất, vector 768 chiều, model embedding và thời điểm đồng bộ.
- Khi thay model embedding, tiến trình đồng bộ sẽ nhận diện model cũ và tạo lại vector.
- Dữ liệu mẫu được nạp khi bảng tài khoản/khu vực/danh mục/quán tương ứng chưa có dữ liệu.
- Form khảo sát đánh giá quán là kênh thu thập dữ liệu ngoài website; dữ liệu chỉ xuất hiện trong chatbot sau khi được đưa vào database và đồng bộ embedding.

## Tài liệu liên quan

- [Frontend React README](frontend/README.md)
- [Kiến trúc hệ thống](docs/ARCHITECTURE-SPINE.md)
- [Yêu cầu sản phẩm](docs/prd.md)
- [Hướng dẫn thu thập dữ liệu](docs/DATA_COLLECTION_GUIDE.md)
- [Schema PostgreSQL](docs/schema.sql)
