import { useCallback, useState } from "react";
import {
  Link,
  NavLink,
  Navigate,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useFavorites } from "../contexts/FavoritesContext";
import { useToast } from "../contexts/ToastContext";
import { api } from "../services/api";
import { useResource } from "../hooks/useResource";
import { positiveInt } from "../hooks/usePlaceFilters";
import { dateLabel, errorMessage, validateImage } from "../utils/format";
import type { User } from "../types/api";
import { RestaurantCard } from "../components/places/RestaurantCard";
import { ReviewCard } from "../components/reviews/ReviewCard";
import {
  EmptyState,
  ErrorState,
  LoadingCards,
  Unavailable,
} from "../components/common/States";
import { Pagination } from "../components/common/Pagination";
import { Photo } from "../components/common/Photo";
import { Icon } from "../components/common/Icon";

function Profile({ user }: { user: User }) {
  const { refresh } = useAuth(),
    notify = useToast();
  const [name, setName] = useState(user.displayName),
    [avatar, setAvatar] = useState<File>();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <section className="profile-card">
      <h2>Hồ sơ của tôi</h2>
      <div className="profile-summary">
        <div className="profile-avatar">
          {user.avatarUrl ? (
            <Photo
              src={user.avatarUrl}
              alt={`Ảnh đại diện ${user.displayName}`}
            />
          ) : (
            <span>{user.displayName.charAt(0)}</span>
          )}
        </div>
        <div>
          <h3>{user.displayName}</h3>
          <p>{user.email}</p>
          {user.createdAt && (
            <small>Tham gia từ {dateLabel(user.createdAt)}</small>
          )}
        </div>
      </div>
      <div className="profile-stats">
        <div>
          <strong>{user.totalReviews ?? "—"}</strong>
          <span>Đánh giá đã viết</span>
        </div>
        <div>
          <strong>{user.totalFavorites ?? "—"}</strong>
          <span>Quán đã lưu</span>
        </div>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) {
            setError("Tên hiển thị không được để trống.");
            return;
          }
          setBusy(true);
          setError("");
          try {
            const avatarUrl = avatar
              ? (await api.upload(avatar)).url
              : undefined;
            await api.profile(name.trim(), avatarUrl);
            await refresh();
            setAvatar(undefined);
            notify("Hồ sơ đã được cập nhật.");
          } catch (err) {
            setError(errorMessage(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field">
          Tên hiển thị
          <input
            name="displayName"
            autoComplete="nickname"
            required
            maxLength={100}
            disabled={busy}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="field">
          Ảnh đại diện mới
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              const invalid = validateImage(file);
              if (invalid) {
                setError(invalid);
                return;
              }
              setError("");
              setAvatar(file);
            }}
          />
        </label>
        {avatar && (
          <p className="form-description">
            Đã chọn: {avatar.name}{" "}
            <button
              type="button"
              className="text-button"
              onClick={() => setAvatar(undefined)}
            >
              Bỏ chọn
            </button>
          </p>
        )}
        <p className="form-description">
          Ảnh JPG, PNG, WebP, tối đa 5 MB. Email chưa hỗ trợ thay đổi.
        </p>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <button className="button primary" type="submit" disabled={busy}>
          {busy ? "Đang lưu…" : "Lưu hồ sơ"}
          <Icon name="check" size={17} />
        </button>
      </form>
    </section>
  );
}
function SavedPlaces() {
  const favorite = useFavorites();
  return (
    <section>
      <h2 className="account-section-title">Những quán bạn muốn ghé lại</h2>
      {favorite.loading ? (
        <LoadingCards count={3} />
      ) : favorite.error ? (
        <ErrorState
          error={new Error(favorite.error)}
          onRetry={favorite.retry}
        />
      ) : favorite.places.length ? (
        <div className="restaurant-grid saved-grid">
          {favorite.places.map((place) => (
            <RestaurantCard key={place.id} place={place} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Danh sách ngon đang chờ bạn"
          description="Bấm biểu tượng lưu ở một quán để thêm vào góc riêng của mình."
        >
          <Link to="/" className="button primary">
            Khám phá quán ngon
          </Link>
        </EmptyState>
      )}
    </section>
  );
}
function MyReviews() {
  const [params, setParams] = useSearchParams();
  const page = positiveInt(params.get("page"));
  const reviews = useResource(
    useCallback((signal: AbortSignal) => api.myReviews(page, signal), [page]),
  );
  return (
    <section>
      <h2 className="account-section-title">Những bữa ăn bạn đã kể</h2>
      {reviews.loading ? (
        <p role="status">Đang tải đánh giá…</p>
      ) : reviews.error ? (
        <ErrorState error={reviews.error} onRetry={reviews.retry} />
      ) : reviews.data?.items.length ? (
        <>
          <div className="review-list">
            {reviews.data.items.map((review) => (
              <ReviewCard
                key={`${review.id}-${review.updatedAt}`}
                review={review}
                onChanged={reviews.retry}
                showStatus
              />
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={reviews.data.totalPages}
            onChange={(value) => setParams({ page: String(value) })}
          />
        </>
      ) : page > 1 ? (
        <EmptyState
          title="Trang này chưa có đánh giá"
          description="Danh sách có thể đã thay đổi sau khi xóa một đánh giá."
        >
          <button className="button secondary" onClick={() => setParams({})}>
            Về trang đầu
          </button>
        </EmptyState>
      ) : (
        <EmptyState
          title="Trải nghiệm của bạn đáng được kể"
          description="Ghé trang một quán để viết đánh giá đầu tiên."
        >
          <Link to="/" className="button primary">
            Tìm quán để đánh giá
          </Link>
        </EmptyState>
      )}
    </section>
  );
}
export function AccountPage({
  tab = "profile",
}: {
  tab?: "profile" | "saved" | "reviews" | "reports";
}) {
  const { user } = useAuth(),
    location = useLocation();
  if (!user)
    return (
      <Navigate
        to={`/dang-nhap?next=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  return (
    <div className="container page-space">
      <div className="page-heading account-heading">
        <span className="eyebrow">Góc nhỏ của bạn</span>
        <h1>Chào {user.displayName}.</h1>
        <p>Quán đã lưu, bữa ăn đã kể và những lần khám phá sắp tới.</p>
      </div>
      <div className="account-layout">
        <nav className="account-tabs" aria-label="Tài khoản">
          <NavLink end to="/tai-khoan">
            <Icon name="user" />
            Hồ sơ của tôi
          </NavLink>
          <NavLink to="/tai-khoan/quan-da-luu">
            <Icon name="bookmark" />
            Quán đã lưu
          </NavLink>
          <NavLink to="/tai-khoan/danh-gia">
            <Icon name="star" />
            Đánh giá của tôi
          </NavLink>
          <NavLink to="/tai-khoan/bao-cao">
            <Icon name="flag" />
            Báo cáo của tôi
          </NavLink>
        </nav>
        <div className="account-content">
          {tab === "profile" ? (
            <Profile key={user.id} user={user} />
          ) : tab === "saved" ? (
            <SavedPlaces />
          ) : tab === "reviews" ? (
            <MyReviews />
          ) : (
            <Unavailable
              title="Lịch sử báo cáo chưa được hỗ trợ"
              description="Bạn vẫn có thể báo cáo tại từng đánh giá. Lịch sử xử lý chưa thể hiển thị tại đây; trạng thái này không có nghĩa là bạn chưa gửi báo cáo."
            />
          )}
        </div>
      </div>
    </div>
  );
}
