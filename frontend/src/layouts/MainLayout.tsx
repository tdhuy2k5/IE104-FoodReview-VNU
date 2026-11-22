import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useFavorites } from "../contexts/FavoritesContext";
import { useToast } from "../contexts/ToastContext";
import { Icon } from "../components/common/Icon";
import { Brand } from "../components/common/Brand";
const links = [
  ["/", "Trang chủ"],
  ["/cong-dong", "Cộng đồng"],
  ["/dia-diem", "Địa điểm"],
  ["/lien-he", "Liên hệ"],
];
export function MainLayout() {
  const { user, logout } = useAuth(),
    favorites = useFavorites(),
    notify = useToast();
  const [mobile, setMobile] = useState(false),
    [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  useEffect(() => {
    setMobile(false);
    setMenu(false);
  }, [location.pathname]);
  useEffect(() => {
    document.getElementById("main-content")?.focus({ preventScroll: true });
    if (!location.search && !location.state?.preserveScroll)
      window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenu(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobile(false);
        if (menu) trigger.current?.focus();
        setMenu(false);
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [menu]);
  return (
    <>
      <a className="skip-link" href="#main-content">
        Đến nội dung chính
      </a>
      <header className="site-header">
        <div className="container header-inner">
          <Brand />
          <nav className="desktop-nav" aria-label="Điều hướng chính">
            {links.map(([url, text]) => (
              <NavLink key={url} to={url} end={url === "/"}>
                {text}
              </NavLink>
            ))}
          </nav>
          <div className="header-actions">
            <button
              type="button"
              className="icon-button mobile-toggle"
              aria-label={mobile ? "Đóng menu" : "Mở menu"}
              aria-controls="mobile-navigation"
              aria-expanded={mobile}
              onClick={() => setMobile(!mobile)}
            >
              <Icon name={mobile ? "close" : "menu"} />
            </button>
            {user ? (
              <div className="user-navigation" ref={menuRef}>
                <button
                  ref={trigger}
                  className="user-trigger"
                  aria-expanded={menu}
                  aria-controls="account-menu"
                  onClick={() => setMenu(!menu)}
                >
                  <span className="avatar-initial">
                    {user.displayName.charAt(0)}
                  </span>
                  <span className="user-name">{user.displayName}</span>
                  <span className="dropdown-arrow" aria-hidden="true"><Icon name="chevron" size={16} className="dropdown-chevron" /></span>
                </button>
                {menu && (
                  <div id="account-menu" className="account-dropdown">
                    <p className="dropdown-email">{user.email}</p>
                    <Link to="/tai-khoan">Hồ sơ của tôi</Link>
                    <Link to="/tai-khoan/quan-da-luu">
                      Quán đã lưu{" "}
                      <span>
                        {favorites.loading || favorites.error
                          ? "—"
                          : favorites.places.length}
                      </span>
                    </Link>
                    <Link to="/tai-khoan/danh-gia">Đánh giá của tôi</Link>
                    <Link to="/tai-khoan/bao-cao">Báo cáo của tôi</Link>
                    <button
                      onClick={() => {
                        logout();
                        setMenu(false);
                        notify("Bạn đã đăng xuất trên thiết bị này.");
                      }}
                    >
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link className="button primary button-small" to="/dang-nhap">
                <Icon name="user" size={16} />
                <span>Đăng nhập</span>
              </Link>
            )}
          </div>
        </div>
        {mobile && (
          <nav
            id="mobile-navigation"
            className="container mobile-nav"
            aria-label="Điều hướng trên điện thoại"
          >
            {links.map(([url, text]) => (
              <NavLink
                key={url}
                to={url}
                end={url === "/"}
                onClick={() => setMobile(false)}
              >
                {text}
              </NavLink>
            ))}
          </nav>
        )}
      </header>
      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container footer-top">
          <Brand footer />
          <nav aria-label="Thông tin website">
            <Link to="/thong-tin">Về chúng tôi</Link>
            <Link to="/thong-tin#bao-mat">Bảo mật</Link>
            <Link to="/thong-tin#dieu-khoan">Điều khoản</Link>
            <Link to="/lien-he">Liên hệ</Link>
          </nav>
        </div>
        <div className="container footer-bottom">
          <span>
            © {new Date().getFullYear()} Foodie Review · Làng Đại học
          </span>
          <span>Giá và giờ mở cửa là thông tin tham khảo.</span>
        </div>
      </footer>
    </>
  );
}
