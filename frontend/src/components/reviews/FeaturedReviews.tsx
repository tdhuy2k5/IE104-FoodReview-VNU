import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../services/api";
import { useResource } from "../../hooks/useResource";
import { dateLabel } from "../../utils/format";
import { Icon } from "../common/Icon";
import { Modal } from "../common/Modal";
import { Photo } from "../common/Photo";
import type { Place, Review } from "../../types/api";
import { ReviewInteractions } from "./ReviewInteractions";
import "./FeaturedReviews.css";

function reviewPreview(content: string) {
  const text = content.trim().replace(/\s+/g, " ");
  if (text.length <= 80) return text;
  const excerpt = text.slice(0, 80);
  const boundary = excerpt.lastIndexOf(" ");
  return `${excerpt.slice(0, boundary > 40 ? boundary : 80).replace(/[.,;:!?…]+$/, "")}...`;
}

export function FeaturedReviews() {
  const [selected, setSelected] = useState<{ review: Review; place: Place } | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const openReview = (review: Review, place: Place) => {
    setImageIndex(0);
    setSelected({ review, place });
  };
  const resource = useResource(useCallback(async (signal: AbortSignal) => {
    const places = await api.places({ SortBy: "rating", PageIndex: 1, PageSize: 6 }, signal);
    const candidates = places.items.filter(place => place.reviewCount > 0).slice(0, 6);
    const results = await Promise.allSettled(candidates.map(async place => {
      const page = await api.reviews(place.id, 1, signal);
      const review = page.items
        .filter(item => item.placeId === place.id && item.status === 1 && item.rating >= 4 && item.content.trim())
        .sort((a, b) => b.rating - a.rating || Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
      return review ? { review, place } : null;
    }));
    return {
      items: results.flatMap(result => result.status === "fulfilled" && result.value ? [result.value] : [])
        .sort((a, b) => b.review.rating - a.review.rating || Date.parse(b.review.createdAt) - Date.parse(a.review.createdAt))
        .slice(0, 3),
      failed: results.some(result => result.status === "rejected"),
    };
  }, []));

  return (
    <section className="featured-reviews" aria-labelledby="featured-reviews-title">
      <div className="container">
        <div className="featured-reviews-heading">
          <div>
            <span className="eyebrow">Ngon hơn khi cùng chia sẻ</span>
            <h2 id="featured-reviews-title">Đánh giá nổi bật</h2>
            <p>Một chút trải nghiệm, thêm một quán ngon.</p>
          </div>
          <Link className="button secondary" to="/cong-dong">Ghé cộng đồng <Icon name="arrow" size={17} /></Link>
        </div>
        {resource.loading ? (
          <div className="featured-review-grid" role="status" aria-label="Đang tải đánh giá nổi bật">
            {[0, 1, 2].map(index => <div key={index} className="featured-review-skeleton" aria-hidden="true"><div className="skeleton skeleton-line" /><div className="skeleton skeleton-line" /><div className="skeleton skeleton-line short" /></div>)}
          </div>
        ) : resource.error ? (
          <div className="featured-review-state" role="status"><p>Chưa tải được đánh giá nổi bật.</p><button className="text-button" aria-label="Tải lại đánh giá nổi bật" onClick={resource.retry}>Thử lại</button></div>
        ) : (
          <>
            {resource.data?.items.length ? (
              <div className="featured-review-grid">
                {resource.data.items.map(({ review, place }) => (
                  <article className="featured-review-card" key={review.id}>
                    <div className="featured-review-meta">
                      <span className="avatar-initial" aria-hidden="true">{review.author.displayName.charAt(0)}</span>
                      <div><h3>{review.author.displayName}</h3><time dateTime={review.createdAt}>{dateLabel(review.createdAt)}</time></div>
                      <span className="featured-review-rating"><Icon name="star" size={15} />{review.rating}/5</span>
                    </div>
                    <blockquote><button type="button" className="featured-review-open"
                      aria-label={`Đọc đầy đủ đánh giá của ${review.author.displayName} tại ${place.name}`}
                      onClick={() => openReview(review, place)}>{reviewPreview(review.content)}</button></blockquote>
                    <div className="featured-review-footer">
                      <Link className="featured-review-place" to={`/quan/${place.slug}`}>{place.name}</Link>
                      <button type="button" className="text-button featured-review-read-more" onClick={() => openReview(review, place)}
                        aria-label={`Đọc tiếp đánh giá tại ${place.name}`}>Đọc tiếp <Icon name="arrow" size={14} /></button>
                    </div>
                    <ReviewInteractions reviewId={review.id} authorId={review.author.id} />
                  </article>
                ))}
              </div>
            ) : !resource.data?.failed && (
              <div className="featured-review-state"><p>Chưa có đánh giá nổi bật. Ghé một quán và chia sẻ trải nghiệm của bạn nhé.</p><Link className="text-button" to="/dia-diem">Khám phá quán ngon <Icon name="arrow" size={15} /></Link></div>
            )}
            {resource.data?.failed && <div className="featured-review-state" role="status"><p>Một số đánh giá chưa tải được.</p><button className="text-button" aria-label="Tải lại đánh giá nổi bật" onClick={resource.retry}>Thử lại</button></div>}
          </>
        )}
      </div>
      {selected && (
        <Modal title={`Trải nghiệm tại ${selected.place.name}`} onClose={() => setSelected(null)}>
          <div className="featured-review-meta">
            <span className="avatar-initial" aria-hidden="true">{selected.review.author.displayName.charAt(0)}</span>
            <div><h3>{selected.review.author.displayName}</h3><time dateTime={selected.review.createdAt}>{dateLabel(selected.review.createdAt)}</time></div>
            <span className="featured-review-rating"><Icon name="star" size={16} />{selected.review.rating}/5</span>
          </div>
          <p className="featured-review-full-content">{selected.review.content}</p>
          <ReviewInteractions reviewId={selected.review.id} authorId={selected.review.author.id} />
          {!!selected.review.images?.length && (
            <div className="featured-review-gallery">
              <Photo key={selected.review.images[imageIndex].id} src={selected.review.images[imageIndex].imageUrl}
                alt={selected.review.images[imageIndex].altText || `Ảnh trải nghiệm tại ${selected.place.name}, ảnh ${imageIndex + 1}`} />
              {selected.review.images.length > 1 && (
                <div className="featured-review-gallery-controls">
                  <button type="button" className="icon-button" aria-label="Ảnh trước"
                    onClick={() => setImageIndex((imageIndex - 1 + selected.review.images.length) % selected.review.images.length)}>‹</button>
                  <span role="status" aria-live="polite">{imageIndex + 1} / {selected.review.images.length}</span>
                  <button type="button" className="icon-button" aria-label="Ảnh tiếp theo"
                    onClick={() => setImageIndex((imageIndex + 1) % selected.review.images.length)}>›</button>
                </div>
              )}
            </div>
          )}
          <div className="form-actions">
            <button type="button" className="button secondary" onClick={() => setSelected(null)}>Đóng</button>
            <Link className="button primary" to={`/quan/${selected.place.slug}`}
              onClick={() => setSelected(null)}>Xem quán và đánh giá <Icon name="arrow" size={16} /></Link>
          </div>
        </Modal>
      )}
    </section>
  );
}
