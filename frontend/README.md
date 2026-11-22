# Foodie Review · React frontend

Frontend React + TypeScript + Vite, kế thừa màu xanh đậm/nền kem, font Noto Serif/Plus Jakarta Sans và các màn hình của Google Stitch. Backend và database không được chỉnh sửa hoặc khởi chạy trong quá trình chuyển đổi.

## Chạy tại máy

```powershell
cd frontend
npm.cmd ci --cache .npm-cache
npm.cmd run dev
```

Mở địa chỉ Vite in trong terminal, mặc định `http://127.0.0.1:5173`.

Sao chép `.env.example` thành `.env.local` khi cần đổi kết nối. Mặc định Frontend gọi `/api` qua Vite proxy đến `http://localhost:5114`, đúng launch profile Backend hiện có. Nếu Backend đã chạy bằng Docker tại cổng 5000, đặt `API_PROXY_TARGET=http://localhost:5000` rồi khởi động lại Vite. Tài liệu này không yêu cầu chạy Backend hoặc tạo/seed database tự động.

Frontend hiển thị lỗi kết nối cùng nút thử lại khi API chưa sẵn sàng; không chuyển sang dữ liệu quán giả. Ảnh trong hero chỉ là ảnh minh họa ẩm thực đã được dùng trong bản Stitch, không phải thông tin của một quán cụ thể.

## Phạm vi đã triển khai

- Trang chủ và trang địa điểm: tìm kiếm bằng Enter/nút Tìm, danh mục và khu vực từ API, bộ lọc ngân sách, sắp xếp, phân trang từ server; state nằm trong URL.
- Chi tiết quán theo slug: dữ liệu thật, menu, khoảng giá, địa chỉ, giờ mở cửa, link chỉ đường; không tự suy ra trạng thái đang mở cửa.
- Đăng ký, đăng nhập, hồ sơ, thay avatar, đăng xuất; token chỉ giữ trong bộ nhớ của tab. Tải lại trang cần đăng nhập lại. Không có refresh token hoặc API thu hồi token ở Backend hiện tại.
- Lưu/bỏ lưu quán được đồng bộ giữa các trang, khóa request trùng và xử lý lỗi. Không tự retry API toggle.
- Review: chọn điểm nguyên 1–5, nội dung tối đa 2.000 ký tự, tối đa 5 ảnh theo giới hạn UI. Upload từng ảnh JPG/PNG/WebP ≤5 MB rồi gửi URL. Sửa/xóa review chính chủ, báo cáo review với lý do.
- Loading, empty, error, 404, phản hồi thành công, modal native có quản lý focus, liên kết skip-to-content, các form có label.
- Route: `/`, `/dia-diem`, `/quan/:slug`, `/cong-dong`, `/lien-he`, `/dang-nhap`, `/dang-ky`, `/tai-khoan`, `/tai-khoan/quan-da-luu`, `/tai-khoan/danh-gia`, `/tai-khoan/bao-cao`, `/thong-tin`.

## Hiệu ứng 3D

Không dùng Three.js/GSAP hoặc thư viện animation. Hook `useTilt` giới hạn góc nghiêng thẻ ở 4°, hero ở 5°, ảnh chi tiết ở 2°; chỉ bật với con trỏ chính xác và hover. Chỉ đo bố cục khi pointer đi vào, cập nhật bằng `requestAnimationFrame`, hủy frame khi rời/unmount. Ảnh hero, nhãn và nội dung thẻ có lớp `translateZ` cùng bóng tạo chiều sâu. Mobile giữ chiều sâu thị giác bằng lớp ảnh/bóng và phản hồi nút; không nghiêng theo thao tác chạm để tránh cản cuộn trang. `prefers-reduced-motion` tắt các chuyển động không thiết yếu và giữ nội dung hiển thị.

## Hợp đồng API

Lớp service nằm ở `src/services`, DTO nằm ở `src/types/api.ts`. Không dùng endpoint trong tài liệu kiến trúc nếu khác controller thực tế.

| Nhóm | API |
|---|---|
| Danh mục/khu vực | `GET /api/categories`, `GET /api/areas` |
| Quán | `GET /api/places`, `GET /api/places/slug/{slug}` |
| Tài khoản | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `PUT /api/auth/profile` |
| Lưu quán | `GET /api/favorites`, `POST /api/places/{id}/favorite` |
| Review | `GET/POST /api/reviews/place/{placeId}`, `GET /api/reviews/my`, `PUT/DELETE /api/reviews/{id}` |
| Báo cáo | `POST /api/reviews/{id}/report` |
| Upload | `POST /api/upload?folder=images`, multipart field `file` |

Danh sách quán sử dụng `Search`, `AreaId`, `CategoryId`, `MinPrice`, `MaxPrice`, `SortBy`, `PageIndex`, `PageSize`. Review dùng `page`, `pageSize`. Response bọc bởi `success/message/data`; enum được ánh xạ theo số. HTTP client xử lý cả ProblemDetails và lỗi proxy không phải JSON. URL ảnh `/uploads/...` được phân giải theo origin API. `VITE_` là biến công khai trong bundle; không đặt khóa bí mật tại đây.

## Những phần chưa thể tích hợp

Giữ màn hình và thể hiện trạng thái chưa khả dụng, không hiển thị số liệu giả hay báo đã gửi thành công:

- Feed cộng đồng toàn hệ thống và khối review mới nhất toàn website.
- Lượt hữu ích, bình luận dưới review, xác minh sinh viên.
- Lịch sử báo cáo của người dùng.
- Liên hệ/đề xuất quán; email/văn phòng hỗ trợ và chính sách chính thức chưa được xác minh.
- Bản đồ nhiều quán: API danh sách chưa có tọa độ. Có sơ đồ minh họa và chỉ đường tại chi tiết từng quán.

Các vấn đề Backend đã phát hiện và chỉ báo cáo:

1. `PlaceService.GetPlacesAsync`: count query không áp dụng `MinRating` dù truy vấn items áp dụng HAVING. Chưa đưa bộ lọc MinRating vào UI.
2. `PlaceService.GetPlaceDetailAsync`: chưa giới hạn Published. Frontend không render chi tiết Draft/Hidden, nhưng đây không thay thế kiểm soát truy cập tại Backend.
3. `recentReviews` trong response chi tiết hiện không giới hạn, truy vấn ảnh theo từng review. Frontend sử dụng API review phân trang để trình bày nhưng không thể tự giảm payload của response chi tiết.
4. Review mới hiện được Published ngay. Thông báo Frontend dựa trên status response, không mặc định nói đang chờ kiểm duyệt.
5. Upload ảnh và ghi review là hai bước không có transaction chung/API xóa upload cho người dùng; nếu bỏ dở có thể còn file chưa gắn vào review. Frontend tái sử dụng URL đã upload thành công khi retry, không tự xóa file máy chủ.

## Kiểm thử

```powershell
npm.cmd run build
npm.cmd test
npx.cmd playwright test
```

- Vitest: hợp đồng API, upload boundary, lỗi 401/ProblemDetails, lọc URL, request race, modal và hồi quy phân trang.
- Playwright: chạy Edge có sẵn (`channel: msedge`), dùng API interception chỉ trong test. Kiểm tra tìm kiếm, lọc, Back, login, favorites, profile, review CRUD/report, lỗi API, 3D/reduced motion và responsive. Không gửi request đến Backend/database. Nếu máy không có Edge, cần chủ động chọn trình duyệt đã cài trong cấu hình kiểm thử.
- Ảnh QA và trace lỗi được ghi trong `test-results/` và không đưa vào Git. Dữ liệu fixture trong `tests/` không được import vào ứng dụng.
- Kiểm thử với Backend thật cần dịch vụ sẵn sàng và dữ liệu/tài khoản kiểm thử do người phụ trách cung cấp. Kết quả fixture không được coi là đã xác nhận Backend/database thực tế.

## Bảo toàn nguồn và triển khai

Kết quả kiểm chứng ngày 18/11/2026: build TypeScript/Vite thành công; 13 kiểm thử Vitest và 6 kiểm thử Edge headless đều qua. Đã kiểm tra responsive ở 390/768/1440px, upload ảnh, cảnh báo bản nháp, 3D và reduced motion. SHA-256 xác nhận bản Stitch gốc, bản sao lưu và 43 file Backend giữ nguyên. Không thấy API lắng nghe tại các cổng cấu hình 5000/5114/7158 ở thời điểm kiểm tra, nên chưa xác nhận luồng end-to-end với Backend/database thực tế.

`code.html` giữ nguyên; bản sao nằm tại `legacy/code.original.html`. `legacy/baseline.json` lưu SHA-256 bản Stitch và các file Backend để đối chiếu không thay đổi. Các chỉnh sửa, dependency và output build đều nằm trong `frontend/`.

Triển khai nội dung `dist/` trên static host có SPA fallback về `index.html` để link trực tiếp hoạt động. Nếu gọi API khác origin, đặt `VITE_API_BASE_URL=https://your-api.example/api` trước build và dùng HTTPS phù hợp. Vite proxy chỉ dùng trong phát triển, không tự đi theo bản build. Không thay đổi cấu hình Backend để host Frontend.

Frontend Skills đã tham chiếu: Frontend Design, Vercel React Best Practices và MengTo Animation Systems; kết hợp với bản phân tích UI/UX đã duyệt. Không cài Python hoặc sửa các skill của dự án.
