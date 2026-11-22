import { Unavailable } from "../components/common/States";
export function ContactPage() {
  return (
    <div className="container page-space">
      <header className="page-heading">
        <span className="eyebrow">Cùng làm cẩm nang tốt hơn</span>
        <h1>
          Bạn có điều
          <br />
          muốn <em>chia sẻ?</em>
        </h1>
        <p>
          Đề xuất quán mới, góp ý thông tin hoặc kể về một góc ngon quanh Làng.
        </p>
      </header>
      <div className="contact-layout">
        <section className="contact-form-card">
          <h2>Gửi thông tin cho ban quản trị</h2>
          <Unavailable
            title="Chưa thể gửi liên hệ"
            description="Kênh gửi góp ý và đề xuất quán trực tuyến chưa khả dụng. Form này chưa tiếp nhận thông tin, nên bạn chưa thể gửi lời nhắn tại đây."
          />
          <form onSubmit={(e) => e.preventDefault()}>
            <fieldset disabled>
              <legend>Mục đích liên hệ</legend>
              <div className="contact-purpose">
                <label>
                  <input type="radio" name="purpose" defaultChecked />
                  Đề xuất quán mới
                </label>
                <label>
                  <input type="radio" name="purpose" />
                  Báo sai thông tin
                </label>
              </div>
              <label className="field">
                Họ tên
                <input
                  name="name"
                  autoComplete="name"
                  placeholder="Tên của bạn"
                />
              </label>
              <label className="field">
                Email liên hệ
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="ban@example.com"
                />
              </label>
              <label className="field">
                Tên quán / địa điểm
                <input name="placeName" placeholder="Quán bạn muốn chia sẻ" />
              </label>
              <label className="field">
                Nội dung
                <textarea
                  name="message"
                  rows={4}
                  placeholder="Địa chỉ, món ăn, khoảng giá hoặc thông tin cần sửa…"
                />
              </label>
              <button className="button primary" type="submit">
                Chưa hỗ trợ gửi thông tin
              </button>
            </fieldset>
          </form>
        </section>
        <aside className="contact-note">
          <span className="eyebrow">Thông tin rõ, cộng đồng vui</span>
          <h2>
            Mỗi góp ý<br />
            đều có ích.
          </h2>
          <p>
            Thông tin văn phòng, email hỗ trợ và thời gian phản hồi trong bản
            thiết kế chưa được xác nhận nên chưa công bố tại đây.
          </p>
          <p>
            Nếu một đánh giá có nội dung không phù hợp, bạn có thể đăng nhập và
            dùng nút <strong>Báo cáo</strong> tại đánh giá đó.
          </p>
        </aside>
      </div>
    </div>
  );
}
