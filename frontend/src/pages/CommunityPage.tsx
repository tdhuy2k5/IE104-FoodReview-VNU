import { Link } from "react-router-dom";
import { Unavailable } from "../components/common/States";
import { Icon } from "../components/common/Icon";
export function CommunityPage() {
  return (
    <div className="container page-space">
      <header className="page-heading community-heading">
        <span className="eyebrow">Làng mình, chuyện ăn uống</span>
        <h1>
          Ăn ngon hơn,
          <br />
          <em>khi cùng chia sẻ.</em>
        </h1>
        <p>
          Một lời nhận xét chân thật là gợi ý cho người ghé quán sau bạn.
        </p>
        <Link to="/dia-diem" className="button primary">
          Chọn quán để viết đánh giá
          <Icon name="arrow" size={18} />
        </Link>
      </header>
      <div
        className="community-filter-preview"
        aria-label="Các bộ lọc chưa tích hợp"
      >
        {[
          "Mới nhất",
          "Hữu ích nhất",
          "Đánh giá 5 sao",
          "Kèm hình ảnh",
          "Đã xác thực SV",
        ].map((tab) => (
          <button key={tab} disabled title="Bộ lọc bảng tin chưa khả dụng">
            {tab}
          </button>
        ))}
      </div>
      <Unavailable
        title="Bảng tin cộng đồng đang chờ tích hợp"
        description="Bảng tin tổng hợp, bình luận và lượt hữu ích chưa khả dụng. Bạn vẫn có thể đọc và chia sẻ đánh giá ở trang từng quán. Chưa có tính năng xác minh sinh viên."
      />
      <section className="community-guidelines">
        <div>
          <span className="guide-number">01</span>
          <h2>Kể đúng trải nghiệm</h2>
          <p>
            Giá món, hương vị và điều bạn thích. Những chi tiết nhỏ giúp ích rất
            nhiều.
          </p>
        </div>
        <div>
          <span className="guide-number">02</span>
          <h2>Tôn trọng nhau</h2>
          <p>
            Góp ý cụ thể, lịch sự với người bán và những người cùng chia sẻ.
          </p>
        </div>
        <div>
          <span className="guide-number">03</span>
          <h2>Ảnh từ bữa ăn thật</h2>
          <p>Ưu tiên hình bạn tự chụp và tránh thông tin riêng tư trong ảnh.</p>
        </div>
      </section>
    </div>
  );
}
