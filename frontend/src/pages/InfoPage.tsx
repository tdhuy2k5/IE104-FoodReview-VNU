import { Link } from "react-router-dom";
export function InfoPage() {
  return (
    <div className="container page-space prose-page">
      <span className="eyebrow">Foodie Review · Làng Đại học</span>
      <h1>
        Cẩm nang từ những
        <br />
        bữa ăn quanh Làng.
      </h1>
      <p>
        Website giúp cộng đồng tìm quán, tham khảo giá và chia sẻ trải nghiệm ẩm
        thực quanh ĐHQG TP.HCM. Không hỗ trợ đặt món, giao hàng hoặc thanh toán.
      </p>
      <section id="bao-mat">
        <h2>Thông tin về dữ liệu và bảo mật</h2>
        <p>
          Phiên đăng nhập được giữ trong bộ nhớ của tab hiện tại. Các thao tác
          đăng ký, lưu quán, đăng đánh giá và tải ảnh gửi dữ liệu đến Backend
          của dự án. Không đưa thông tin riêng tư vào nội dung hoặc ảnh công
          khai.
        </p>
        <p>
          Chính sách bảo mật chính thức chưa được chủ website công bố. Nội dung
          này chỉ mô tả hoạt động của bản Frontend hiện tại.
        </p>
      </section>
      <section id="dieu-khoan">
        <h2>Điều khoản sử dụng</h2>
        <p>
          Điều khoản chính thức đang chờ được xác nhận. Khi đóng góp, hãy chia
          sẻ đúng trải nghiệm và tôn trọng cộng đồng. Giá, menu và giờ mở cửa là
          thông tin tham khảo.
        </p>
      </section>
      <Link to="/" className="button primary">
        Khám phá quán ngon
      </Link>
    </div>
  );
}
