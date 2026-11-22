# TÀI LIỆU LUỒNG HOẠT ĐỘNG TOÀN BỘ SERVICES & CHỨC NĂNG
## DỰ ÁN: FOOD REVIEW - LÀNG ĐẠI HỌC (ĐHQG TP.HCM)

---

## 1. TỔNG QUAN KIẾN TRÚC & PHÂN TẦNG (ARCHITECTURE OVERVIEW)

Hệ thống backend được xây dựng theo kiến trúc phân tầng (Clean Layered Architecture) trên nền tảng .NET 9 Web API và Dapper Micro-ORM kết nối cơ sở dữ liệu PostgreSQL.

```mermaid
flowchart LR
    Client["Client (Web/Mobile)"] -->|"HTTP + JWT"| Middleware["Middleware"]
    Middleware --> Controllers["Controller Layer"]
    Controllers --> Services

    subgraph Services ["Service Layer (Business Logic)"]
        direction TB
        AuthSvc["AuthService"]
        PlaceSvc["PlaceService"]
        ReviewSvc["ReviewService"]
        InteractSvc["InteractionService"]
        AdminSvc["AdminService"]
        CatAreaSvc["CategoryAreaService"]
        FileSvc["LocalFileStorageService"]
    end

    Services --> DataStore

    subgraph DataStore ["Data Access & Storage"]
        direction TB
        Dapper["Dapper Micro-ORM"] --> Postgres[("PostgreSQL 16")]
        DiskStorage[("File Server (wwwroot/uploads)")]
    end

    FileSvc -.-> DiskStorage
```

---

## 2. LUỒNG XÁC THỰC & HỒ SƠ NGƯỜI DÙNG (`AuthService`)

### 2.1. Đăng ký tài khoản (`RegisterAsync`)
1. Client gửi thông tin: `Email`, `Password`, `DisplayName`.
2. Hệ thống kiểm tra trùng lặp email không phân biệt chữ hoa/thường (`LOWER(Email)`).
3. Mật khẩu được băm an toàn bằng thuật toán `BCrypt`.
4. Ghi bản ghi vào bảng `Users` với quyền mặc định `Role = User (0)`, trạng thái `Status = Active (0)`.
5. Sinh mã thông báo JWT trả về cùng thông tin người dùng.

```mermaid
sequenceDiagram
    autonumber
    actor Client as Người dùng
    participant Ctrl as AuthController
    participant Svc as AuthService
    participant DB as PostgreSQL (Users)

    Client->>Ctrl: POST /api/auth/register (Email, Password, DisplayName)
    Ctrl->>Svc: RegisterAsync(request)
    Svc->>DB: SELECT COUNT(1) WHERE LOWER(Email) = LOWER(@Email)
    alt Email đã tồn tại
        DB-->>Svc: count > 0
        Svc-->>Ctrl: Ném ngoại lệ "Email này đã được sử dụng"
        Ctrl-->>Client: 400 Bad Request
    else Email hợp lệ
        Svc->>Svc: Băm mật khẩu (BCrypt.HashPassword)
        Svc->>DB: INSERT INTO Users (Email, PasswordHash, DisplayName, Role=0, Status=0) RETURNING Id
        DB-->>Svc: Trả về newUserId
        Svc->>Svc: Sinh chuỗi JWT Token
        Svc-->>Ctrl: Trả về AuthResponse (Token, UserProfile)
        Ctrl-->>Client: 200 OK
    end
```

### 2.2. Đăng nhập hệ thống (`LoginAsync`)

```mermaid
flowchart LR
    Start(["Đăng nhập"]) --> Query["Truy vấn Email"]
    Query --> ChkUser{"User tồn tại?"}
    ChkUser -- "Không" --> Err401["Lỗi 401: Sai tài khoản"]
    ChkUser -- "Có" --> ChkBan{"Đang bị khóa?"}
    ChkBan -- "Status=1 (Banned)" --> Err403["Lỗi 403: Bị khóa"]
    ChkBan -- "Status=0 (Active)" --> ChkPass{"Khớp BCrypt?"}
    ChkPass -- "Sai" --> Err401
    ChkPass -- "Đúng" --> GenToken["Tạo JWT Token (Claims: Id, Role)"]
    GenToken --> Done(["Trả về AuthResponse"])
```

---

## 3. LUỒNG KHÁM PHÁ & QUẢN LÝ QUÁN ĂN (`PlaceService`)

### 3.1. Tìm kiếm và Bộ lọc động (`GetPlacesAsync`)
* **Tìm kiếm theo từ khóa (`Search`):** So khớp không phân biệt hoa thường (`ILIKE`) với tên quán, mô tả, địa chỉ và cả các món có trong menu thông qua `EXISTS (SELECT 1 FROM MenuItems)`.
* **Lọc theo khu vực (`AreaId`):** Bao gồm cả quán nằm tại khu vực được chọn và các khu vực con của nó (`p.AreaId = @AreaId OR a.ParentAreaId = @AreaId`).
* **Lọc theo khoảng giá:** Đối chiếu `PriceMax >= MinPrice` và `PriceMin <= MaxPrice`.
* **Sắp xếp linh hoạt:** Hỗ trợ sắp xếp theo `rating` (đánh giá sao giảm dần), `reviews` (lượng review nhiều nhất), `newest` (mới nhất), hoặc mặc định tên A-Z.

```mermaid
flowchart LR
    In(["FilterParams"]) --> Status["Status = 1 (Published)"]
    Status --> SearchQ["ILIKE: Tên, Mô tả, Địa chỉ, Menu"]
    SearchQ --> AreaQ["AreaId hoặc ParentAreaId"]
    AreaQ --> PriceQ["Khoảng giá Min/Max"]
    PriceQ --> Count["COUNT (Phân trang)"]
    Count --> Paging["OFFSET / LIMIT + AVG(Rating)"]
    Paging --> Out(["PagedResult<PlaceSummaryDto>"])
```

### 3.2. Xem chi tiết quán ăn (`GetPlaceDetailAsync` / `GetPlaceDetailBySlugAsync`)

```mermaid
sequenceDiagram
    autonumber
    actor Client as Người dùng / Khách
    participant Ctrl as PlacesController
    participant Svc as PlaceService
    participant DB as PostgreSQL

    Client->>Ctrl: GET /api/places/{slug} (kèm UserId nếu đã đăng nhập)
    Ctrl->>Svc: GetPlaceDetailBySlugAsync(slug, currentUserId)
    Svc->>DB: Truy vấn Places JOIN Areas, Categories
    DB-->>Svc: Thông tin quán (Địa chỉ, giá, giờ mở cửa, v.v.)
    par Lấy thực đơn
        Svc->>DB: SELECT * FROM MenuItems WHERE PlaceId = @Id
        DB-->>Svc: Danh sách món ăn
    and Lấy đánh giá gần nhất
        Svc->>DB: SELECT * FROM Reviews JOIN Users WHERE PlaceId = @Id AND Status = 1
        DB-->>Svc: Top các bài review & ảnh đính kèm
    and Kiểm tra yêu thích
        Svc->>DB: SELECT COUNT(1) FROM Favorites WHERE UserId = @UserId AND PlaceId = @Id
        DB-->>Svc: Trả về 1 (Đã lưu) hoặc 0 (Chưa lưu)
    end
    Svc->>Svc: Đóng gói toàn bộ thành PlaceDetailDto
    Svc-->>Ctrl: Trả về DTO chi tiết
    Ctrl-->>Client: 200 OK
```

---

## 4. LUỒNG ĐÁNH GIÁ & TẢI ẢNH (`ReviewService` & `LocalFileStorageService`)

### 4.1. Tải tệp hình ảnh (`LocalFileStorageService.SaveFileAsync`)
* **Kiểm tra an toàn:** Dung lượng tối đa không quá 5MB. Định dạng hợp lệ gồm `.jpg`, `.jpeg`, `.png`, `.webp`.
* **Lưu trữ:** Tạo tên file độc nhất bằng `Guid.NewGuid()`, ghi file vào đường dẫn vật lý `wwwroot/uploads/{subFolder}` và trả về URL tương đối `/uploads/{subFolder}/{fileName}`.

### 4.2. Đăng bài đánh giá (`ReviewService.CreateReviewAsync`)

```mermaid
sequenceDiagram
    autonumber
    actor User as Sinh viên (Đã đăng nhập)
    participant Ctrl as ReviewsController
    participant RevSvc as ReviewService
    participant DB as PostgreSQL

    User->>Ctrl: POST /api/places/{placeId}/reviews (Rating, Content, ImageUrls)
    Ctrl->>RevSvc: CreateReviewAsync(placeId, userId, request)
    RevSvc->>DB: Kiểm tra Place có tồn tại và Status != Hidden (2)
    RevSvc->>DB: Kiểm tra User có bị Banned hay không
    RevSvc->>DB: INSERT INTO Reviews (PlaceId, UserId, Rating, Content, Status=1) RETURNING Id
    DB-->>RevSvc: Trả về reviewId vừa tạo
    opt Nếu có ImageUrls đính kèm
        loop Từng ảnh trong danh sách ImageUrls
            RevSvc->>DB: INSERT INTO ReviewImages (ReviewId, ImageUrl)
        end
    end
    RevSvc-->>Ctrl: Trả về ReviewDto đầy đủ
    Ctrl-->>User: 201 Created
```

---

## 5. LUỒNG TƯƠNG TÁC NGƯỜI DÙNG (`InteractionService`)

### 5.1. Bật/Tắt quán yêu thích (`ToggleFavoriteAsync`)

```mermaid
flowchart LR
    Click(["Nhấn Bookmark"]) --> Check["Kiểm tra Favorites (UserId, PlaceId)"]
    Check --> Exists{"Đã có?"}
    Exists -- "Có" --> Del["DELETE Favorites"] --> RetFalse(["false: Bỏ lưu quán"])
    Exists -- "Chưa" --> Verify["Kiểm tra Quán"] --> Ins["INSERT Favorites"] --> RetTrue(["true: Đã lưu quán"])
```

### 5.2. Báo cáo vi phạm đánh giá (`ReportReviewAsync`)
1. Sinh viên phát hiện bài review chứa nội dung phản cảm, quảng cáo spam hoặc sai sự thật.
2. Gửi yêu cầu gồm: `ReviewId`, `Reason` (0: Spam, 1: Inappropriate, 2: Misleading, 3: Other) và `Description`.
3. Hệ thống kiểm tra bài review có tồn tại, sau đó thêm bản ghi vào bảng `Reports` với trạng thái ban đầu `Status = Pending (0)`.

---

## 6. LUỒNG QUẢN TRỊ & KIỂM DUYỆT (`AdminService`)

Dành riêng cho tài khoản có quyền `Role = Admin (1)`.

```mermaid
flowchart LR
    subgraph ReportsFlow ["1. Xử lý Báo cáo Vi phạm"]
        RepIn(["Admin duyệt Report"]) --> Action{"Quyết định"}
        Action -- "Xác nhận vi phạm" --> Hide["Ẩn Review (Hidden) + Status = Resolved"]
        Action -- "Bác bỏ vi phạm" --> Dismiss["Giữ Review + Status = Dismissed"]
        Hide --> SaveAdmin["Lưu HandledBy (AdminId) & HandledAt"]
        Dismiss --> SaveAdmin
    end

    subgraph BanFlow ["2. Khóa / Mở khóa User"]
        BanIn(["Chọn User"]) --> BanState{"Trạng thái"}
        BanState -- "Active (0)" --> SetBan["Chuyển Banned (1)"]
        BanState -- "Banned (1)" --> SetAct["Chuyển Active (0)"]
    end
```

---

## 7. BẢNG TỔNG HỢP MÃ LỖI & MÃ PHẢN HỒI (HTTP STATUS CODES)

| Tình huống nghiệp vụ | HTTP Code | Ngoại lệ ném ra | Mô tả |
| :--- | :--- | :--- | :--- |
| Đăng ký trùng email | `400 Bad Request` | `InvalidOperationException` | Email đã có tài khoản sử dụng. |
| Đăng nhập sai mật khẩu / tài khoản | `401 Unauthorized` | `UnauthorizedAccessException` | Sai thông tin xác thực. |
| Tài khoản bị khóa (Banned) | `403 Forbidden` | `UnauthorizedAccessException` | Bị chặn thao tác đăng bài, review. |
| Không tìm thấy quán ăn / review | `404 Not Found` | `KeyNotFoundException` | Id hoặc Slug không tồn tại trong hệ thống. |
| Upload file sai định dạng hoặc > 5MB | `400 Bad Request` | `InvalidOperationException` | Vi phạm chính sách an toàn file. |
| Sửa/Xóa review của người khác | `403 Forbidden` | `UnauthorizedAccessException` | Không phải chính chủ của bài viết. |

