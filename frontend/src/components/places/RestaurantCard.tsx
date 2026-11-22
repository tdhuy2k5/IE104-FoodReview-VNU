import { Link, useLocation } from "react-router-dom";
import type { Place } from "../../types/api";
import { useAuth } from "../../contexts/AuthContext";
import { useFavorites } from "../../contexts/FavoritesContext";
import { Icon } from "../common/Icon";
import { Photo } from "../common/Photo";
import { priceRange } from "../../utils/format";
export function SaveButton({
  place,
  label = false,
}: {
  place: Place;
  label?: boolean;
}) {
  const { user } = useAuth(),
    favorite = useFavorites(),
    location = useLocation();
  const saved = favorite.places.some((p) => p.id === place.id),
    pending = favorite.pending.has(place.id);
  if (!user)
    return (
      <Link
        className={`save-button ${label ? "with-label" : ""}`}
        aria-label={`Đăng nhập để lưu ${place.name}`}
        to={`/dang-nhap?next=${encodeURIComponent(location.pathname + location.search)}`}
      >
        <Icon name="bookmark" size={18} />
        {label && "Lưu quán"}
      </Link>
    );
  return (
    <button
      type="button"
      className={`save-button ${saved ? "is-saved" : ""} ${label ? "with-label" : ""}`}
      disabled={pending || favorite.loading || !!favorite.error}
      aria-pressed={saved}
      aria-label={`${saved ? "Bỏ lưu" : "Lưu"} ${place.name}`}
      title={
        favorite.error
          ? "Chưa tải được danh sách đã lưu. Hãy thử lại ở tài khoản."
          : undefined
      }
      onClick={() => void favorite.toggle(place)}
    >
      <Icon name="bookmark" size={18} />
      {label && (pending ? "Đang lưu…" : saved ? "Đã lưu quán" : "Lưu quán")}
    </button>
  );
}
export function RestaurantCard({
  place,
  priority = false,
  compact = false,
}: {
  place: Place;
  priority?: boolean;
  compact?: boolean;
}) {
  const location = useLocation();
  const url = `/quan/${encodeURIComponent(place.slug)}`;
  return (
    <article
      className={`restaurant-card ${compact ? "compact" : ""}`}
    >
      <Link
        className="card-image-link"
        to={url}
        state={{ from: location.pathname + location.search }}
        tabIndex={-1}
        aria-hidden="true"
      >
        <Photo src={place.coverImageUrl} alt={place.name} priority={priority} />
        <span className="category-badge">{place.categoryName}</span>
      </Link>
      <div className="card-body">
        <div className="card-rating">
          <Icon name="star" size={15} />
          <strong>
            {place.reviewCount ? place.averageRating.toFixed(1) : "Mới"}
          </strong>
          <span>
            {place.reviewCount
              ? `${place.reviewCount} đánh giá`
              : "Chưa có đánh giá"}
          </span>
        </div>
        <h3>
          <Link to={url} state={{ from: location.pathname + location.search }}>
            {place.name}
          </Link>
        </h3>
        <p className="card-area">
          <Icon name="pin" size={15} />
          {place.areaName}
        </p>
        <div className="card-bottom">
          <span className="card-price">
            {priceRange(place.priceMin, place.priceMax)}
            <small>Giá tham khảo</small>
          </span>
          <SaveButton place={place} />
        </div>
      </div>
    </article>
  );
}
