import { useCallback, useEffect, useState } from "react";
import {
  Link,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { api } from "../services/api";
import { useResource } from "../hooks/useResource";
import { positiveInt } from "../hooks/usePlaceFilters";
import { useTilt } from "../hooks/useTilt";
import { useAuth } from "../contexts/AuthContext";
import { Icon } from "../components/common/Icon";
import { Photo } from "../components/common/Photo";
import {
  EmptyState,
  ErrorState,
  LoadingCards,
} from "../components/common/States";
import { Pagination } from "../components/common/Pagination";
import { Modal } from "../components/common/Modal";
import { SaveButton } from "../components/places/RestaurantCard";
import { ReviewForm } from "../components/reviews/ReviewForm";
import { ReviewCard } from "../components/reviews/ReviewCard";
import { money, priceRange, safeReturnTo } from "../utils/format";

export function PlaceDetailPage() {
  const { slug = "" } = useParams();
  const { user } = useAuth(),
    location = useLocation();
  const detail = useResource(
    useCallback(
      (signal: AbortSignal) => api.place(slug, signal),
      [slug, user?.id],
    ),
  );
  const [params, setParams] = useSearchParams();
  const page = positiveInt(params.get("reviews"));
  const placeId = detail.data?.id,
    published = detail.data?.status === 1;
  const reviews = useResource(
    useCallback(
      (signal: AbortSignal) =>
        placeId && published
          ? api.reviews(placeId, page, signal)
          : Promise.resolve(null),
      [placeId, published, page],
    ),
  );
  const [write, setWrite] = useState(false);
  const tilt = useTilt(2);
  const [writeBusy, setWriteBusy] = useState(false),
    [writeDirty, setWriteDirty] = useState(false);
  useEffect(() => {
    if (reviews.data && page > Math.max(1, reviews.data.totalPages))
      setParams(
        { reviews: String(Math.max(1, reviews.data.totalPages)) },
        { replace: true },
      );
  }, [reviews.data, page, setParams]);
  const changePage = (value: number) => {
    setParams(value === 1 ? {} : { reviews: String(value) });
    document.getElementById("reviews")?.scrollIntoView({ block: "start" });
  };
  const changed = () => {
    reviews.retry();
    detail.retry();
  };
  const closeWrite = () => {
    if (
      !writeBusy &&
      (!writeDirty ||
        window.confirm(
          "Đóng trình viết đánh giá? Các thay đổi chưa lưu sẽ bị bỏ.",
        ))
    )
      setWrite(false);
  };
  if (detail.loading)
    return (
      <div className="container page-space">
        <LoadingCards count={3} />
      </div>
    );
  if (detail.error)
    return (
      <div className="container page-space">
        <Link className="back-link" to="/">
          ← Quay lại khám phá
        </Link>
        <ErrorState error={detail.error} onRetry={detail.retry} />
      </div>
    );
  const place = detail.data;
  if (!place || place.status !== 1)
    return (
      <div className="container page-space">
        <EmptyState
          title="Quán chưa được công khai"
          description="Địa điểm này hiện chưa có thông tin công khai."
        >
          <Link to="/" className="button primary">
            Khám phá quán khác
          </Link>
        </EmptyState>
      </div>
    );
  const destination =
    place.latitude != null && place.longitude != null
      ? `${place.latitude},${place.longitude}`
      : place.address;
  const from = safeReturnTo(
    typeof location.state?.from === "string" ? location.state.from : null,
  );
  return (
    <div className="container page-space">
      <div className="detail-toolbar">
        <Link className="back-link" to={from} state={{ preserveScroll: true }}>
          ← Quay lại danh sách
        </Link>
        <SaveButton place={place} label />
      </div>
      <section className="detail-hero">
        <div className="detail-photo depth-card" {...tilt}>
          <Photo src={place.coverImageUrl} alt={place.name} priority />
        </div>
        <div className="detail-intro">
          <span className="eyebrow">{place.categoryName}</span>
          <h1>{place.name}</h1>
          <div className="detail-rating">
            <Icon name="star" />
            <strong>
              {place.reviewCount
                ? place.averageRating.toFixed(1)
                : "Chưa có điểm"}
            </strong>
            <a href="#reviews">{place.reviewCount} đánh giá</a>
          </div>
          <p>
            <Icon name="pin" size={18} />
            {place.areaName}
          </p>
          <div className="detail-price">
            {priceRange(place.priceMin, place.priceMax)}
            <small>Khoảng giá tham khảo</small>
          </div>
          {user ? (
            <button className="button primary" onClick={() => setWrite(true)}>
              <Icon name="message" size={17} />
              Chia sẻ trải nghiệm
            </button>
          ) : (
            <Link
              className="button primary"
              to={`/dang-nhap?next=${encodeURIComponent(location.pathname)}`}
            >
              Đăng nhập để đánh giá
              <Icon name="arrow" size={17} />
            </Link>
          )}
        </div>
      </section>
      <div className="detail-columns">
        <div>
          <section className="detail-section">
            <span className="eyebrow">Một chút về quán</span>
            <h2>Góc ăn quen quanh Làng</h2>
            <p className="description-text">
              {place.description || "Quán chưa cập nhật phần giới thiệu."}
            </p>
          </section>
          <section className="detail-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Lên món thôi</span>
                <h2>Thực đơn tham khảo</h2>
              </div>
              <Icon name="fork" />
            </div>
            {place.menuItems.length ? (
              <div className="menu-list">
                {place.menuItems.map((item) => (
                  <div className="menu-item" key={item.id}>
                    <div>
                      <h3>{item.name}</h3>
                      {item.note && <p>{item.note}</p>}
                    </div>
                    <strong>{money(item.price)}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">Quán chưa cập nhật thực đơn.</p>
            )}
          </section>
          <section className="detail-section" id="reviews">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Ăn rồi, kể lại</span>
                <h2>Đánh giá từ cộng đồng</h2>
              </div>
              {user && (
                <button
                  className="button secondary button-small"
                  onClick={() => setWrite(true)}
                >
                  Viết đánh giá
                </button>
              )}
            </div>
            {reviews.loading ? (
              <p role="status" className="loading-text">
                Đang tải đánh giá…
              </p>
            ) : reviews.error ? (
              <ErrorState error={reviews.error} onRetry={reviews.retry} />
            ) : reviews.data?.items.length ? (
              <>
                <div className="review-list">
                  {reviews.data.items.map((review) => (
                    <ReviewCard
                      key={`${review.id}-${review.updatedAt}`}
                      review={review}
                      onChanged={changed}
                    />
                  ))}
                </div>
                <Pagination
                  page={page}
                  totalPages={reviews.data.totalPages}
                  onChange={changePage}
                />
              </>
            ) : (
              <EmptyState
                title="Hãy là người kể đầu tiên"
                description="Một đánh giá chân thật có thể giúp ai đó chọn được bữa ăn ngon."
              />
            )}
          </section>
        </div>
        <aside className="detail-sidebar">
          <span className="eyebrow">Trước khi ghé quán</span>
          <h2>Thông tin hữu ích</h2>
          <div className="info-line">
            <Icon name="clock" />
            <div>
              <h3>Giờ mở cửa</h3>
              <p>{place.openingHours || "Chưa cập nhật"}</p>
            </div>
          </div>
          <div className="info-line">
            <Icon name="pin" />
            <div>
              <h3>Địa chỉ</h3>
              <p>{place.address}</p>
            </div>
          </div>
          <a
            className="button primary"
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Mở chỉ đường
            <Icon name="arrow" size={17} />
          </a>
          <p className="sidebar-note">
            Giá và giờ mở cửa có thể thay đổi. Bạn nên kiểm tra thông tin trước
            khi ghé.
          </p>
        </aside>
      </div>
      {write && user && (
        <Modal
          title={`Đánh giá ${place.name}`}
          busy={writeBusy}
          onClose={closeWrite}
        >
          <ReviewForm
            placeId={place.id}
            onBusyChange={setWriteBusy}
            onDirtyChange={setWriteDirty}
            onCancel={() => setWrite(false)}
            onSaved={() => {
              setWriteBusy(false);
              setWrite(false);
              if (page !== 1) changePage(1);
              changed();
            }}
          />
        </Modal>
      )}
    </div>
  );
}
