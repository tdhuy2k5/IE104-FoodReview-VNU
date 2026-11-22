import { lazy, Suspense } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { MainLayout } from "../layouts/MainLayout";
import { ExplorePage } from "../pages/ExplorePage";
import { EmptyState } from "../components/common/States";
const Detail = lazy(() =>
  import("../pages/PlaceDetailPage").then((m) => ({
    default: m.PlaceDetailPage,
  })),
);
const Auth = lazy(() =>
  import("../pages/AuthPage").then((m) => ({ default: m.AuthPage })),
);
const Account = lazy(() =>
  import("../pages/AccountPage").then((m) => ({ default: m.AccountPage })),
);
const Community = lazy(() =>
  import("../pages/CommunityPage").then((m) => ({ default: m.CommunityPage })),
);
const Contact = lazy(() =>
  import("../pages/ContactPage").then((m) => ({ default: m.ContactPage })),
);
const Info = lazy(() =>
  import("../pages/InfoPage").then((m) => ({ default: m.InfoPage })),
);
export function App() {
  return (
    <Suspense
      fallback={
        <div className="container page-space loading-text" role="status">
          Đang mở trang…
        </div>
      }
    >
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<ExplorePage key="home" />} />
          <Route
            path="/dia-diem"
            element={<ExplorePage key="places" mapMode />}
          />
          <Route path="/quan/:slug" element={<Detail />} />
          <Route path="/cong-dong" element={<Community />} />
          <Route path="/lien-he" element={<Contact />} />
          <Route path="/dang-nhap" element={<Auth key="login" />} />
          <Route path="/dang-ky" element={<Auth key="register" register />} />
          <Route path="/tai-khoan" element={<Account />} />
          <Route
            path="/tai-khoan/quan-da-luu"
            element={<Account tab="saved" />}
          />
          <Route
            path="/tai-khoan/danh-gia"
            element={<Account tab="reviews" />}
          />
          <Route
            path="/tai-khoan/bao-cao"
            element={<Account tab="reports" />}
          />
          <Route path="/thong-tin" element={<Info />} />
          <Route
            path="*"
            element={
              <div className="container page-space">
                <EmptyState
                  title="Bạn đi hơi xa khỏi Làng rồi"
                  description="Trang này không tồn tại. Cùng quay lại tìm một quán ngon nhé."
                >
                  <Link className="button primary" to="/">
                    Về trang chủ
                  </Link>
                </EmptyState>
              </div>
            }
          />
        </Route>
      </Routes>
    </Suspense>
  );
}
