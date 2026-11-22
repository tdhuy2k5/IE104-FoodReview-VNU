import { useState } from "react";

import type { Review } from "../../types/api";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { api } from "../../services/api";
import { dateLabel, errorMessage } from "../../utils/format";
import { Modal } from "../common/Modal";
import { Icon } from "../common/Icon";
import { Photo } from "../common/Photo";
import { ReviewForm } from "./ReviewForm";
import { ReviewInteractions } from "./ReviewInteractions";
export function ReviewCard({
  review,
  onChanged,
  showStatus = false,
}: {
  review: Review;
  onChanged: () => void;
  showStatus?: boolean;
}) {
  const { user, refresh } = useAuth(),
    notify = useToast();
  const [mode, setMode] = useState<"edit" | "delete" | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const owned = user?.id === review.author.id;
  const close = () => {
    if (
      !busy &&
      (mode !== "edit" ||
        !dirty ||
        window.confirm("Đóng và bỏ các thay đổi chưa lưu?"))
    ) {
      setMode(null);
      setError("");
    }
  };
  return (
    <article className="review-card">
      <div className="review-header">
        <span className="avatar-initial">
          {review.author.displayName.charAt(0)}
        </span>
        <div>
          <h3>{review.author.displayName}</h3>
          <p>
            <time dateTime={review.createdAt}>
              {dateLabel(review.createdAt)}
            </time>{" "}
            · {review.placeName}
          </p>
        </div>
        <span className="review-rating">
          <Icon name="star" size={16} />
          {review.rating}/5
        </span>
      </div>
      {showStatus && (
        <span className="status-badge">
          {["Chờ kiểm duyệt", "Đã đăng", "Đã ẩn"][review.status] ||
            "Chưa rõ trạng thái"}
        </span>
      )}
      <p className="review-content">{review.content}</p>
      {review.images.length > 0 && (
        <div className="review-images">
          {review.images.map((image) => (
            <Photo
              key={image.id}
              src={image.imageUrl}
              alt={image.altText || `Trải nghiệm tại ${review.placeName}`}
            />
          ))}
        </div>
      )}
      <ReviewInteractions reviewId={review.id} authorId={review.author.id} />
      <div className="review-actions">
        <div className="review-owner-actions">
          {owned ? (
            <>
              <button className="text-button" onClick={() => setMode("edit")}>
                Chỉnh sửa
              </button>
              <button
                className="text-button danger"
                onClick={() => setMode("delete")}
              >
                Xóa
              </button>
            </>
          ) : null}
        </div>
      </div>
      {mode === "edit" && (
        <Modal title="Chỉnh sửa đánh giá" busy={busy} onClose={close}>
          <ReviewForm
            placeId={review.placeId}
            initial={review}
            onBusyChange={setBusy}
            onDirtyChange={setDirty}
            onCancel={() => setMode(null)}
            onSaved={() => {
              setBusy(false);
              setMode(null);
              onChanged();
            }}
          />
        </Modal>
      )}
      {mode === "delete" && (
        <Modal title="Xóa đánh giá này?" onClose={close}>
          <p>
            Đánh giá và ảnh đính kèm sẽ không còn hiển thị. Thao tác này không
            thể hoàn tác.
          </p>
          {error && (
            <p role="alert" className="field-error">
              {error}
            </p>
          )}
          <div className="form-actions">
            <button
              className="button secondary"
              disabled={busy}
              onClick={close}
            >
              Giữ lại
            </button>
            <button
              className="button danger-button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await api.deleteReview(review.id);
                  notify("Đã xóa đánh giá.");
                  setMode(null);
                  onChanged();
                  void refresh().catch(() => {});
                } catch (err) {
                  setError(errorMessage(err));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Đang xóa…" : "Xóa đánh giá"}
            </button>
          </div>
        </Modal>
      )}
    </article>
  );
}
