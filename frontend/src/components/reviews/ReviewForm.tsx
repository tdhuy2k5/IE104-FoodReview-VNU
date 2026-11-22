import { useEffect, useId, useRef, useState } from "react";
import { api } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { errorMessage } from "../../utils/format";
import type { Review } from "../../types/api";
import { ImageUploader } from "./ImageUploader";
import { Icon } from "../common/Icon";
import { Photo } from "../common/Photo";
export function ReviewForm({
  placeId,
  initial,
  onSaved,
  onCancel,
  onBusyChange,
  onDirtyChange,
}: {
  placeId: number;
  initial?: Review;
  onSaved: () => void;
  onCancel: () => void;
  onBusyChange?: (value: boolean) => void;
  onDirtyChange?: (value: boolean) => void;
}) {
  const [rating, setRating] = useState(initial?.rating || 0),
    [content, setContent] = useState(initial?.content || "");
  const [existing, setExisting] = useState(
      initial?.images.map((i) => i.imageUrl) || [],
    ),
    [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [progress, setProgress] = useState("");
  const uploaded = useRef(new Map<File, string>()),
    mounted = useRef(true),
    id = useId();
  const { refresh } = useAuth(),
    notify = useToast();
  const dirty =
    content !== (initial?.content || "") ||
    files.length > 0 ||
    existing.length !== (initial?.images.length || 0) ||
    rating !== (initial?.rating || 0);
  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => {
    mounted.current = true;
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      mounted.current = false;
      window.removeEventListener("beforeunload", warn);
    };
  }, [dirty]);
  return (
    <form
      className="review-form"
      aria-busy={busy}
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        if (!rating || !content.trim()) {
          setError("Vui lòng chọn điểm sao và nhập cảm nhận của bạn.");
          return;
        }
        setBusy(true);
        setError("");
        try {
          const urls = [...existing];
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            setProgress(`Đang tải ảnh ${i + 1}/${files.length}…`);
            let url = uploaded.current.get(file);
            if (!url) {
              url = (await api.upload(file)).url;
              uploaded.current.set(file, url);
            }
            urls.push(url);
          }
          setProgress("Đang lưu đánh giá…");
          const input = { rating, content: content.trim(), imageUrls: urls };
          const result = initial
            ? await api.updateReview(initial.id, input)
            : await api.createReview(placeId, input);
          notify(
            result.status === 0
              ? "Đánh giá đã gửi và đang chờ kiểm duyệt."
              : initial
                ? "Đã cập nhật đánh giá của bạn."
                : "Đánh giá của bạn đã được đăng. Cảm ơn bạn đã chia sẻ!",
          );
          void refresh().catch(() => {});
          if (mounted.current) onSaved();
        } catch (err) {
          if (mounted.current) setError(errorMessage(err));
        } finally {
          if (mounted.current) {
            setBusy(false);
            setProgress("");
          }
        }
      }}
    >
      <fieldset disabled={busy}>
        <legend className="field-title">
          Trải nghiệm của bạn xứng đáng mấy sao?
        </legend>
        <div className="rating-input">
          {[1, 2, 3, 4, 5].map((star) => (
            <label key={star} className={rating >= star ? "selected" : ""}>
              <input
                className="sr-only"
                type="radio"
                name={`rating-${id}`}
                value={star}
                checked={rating === star}
                onChange={() => setRating(star)}
                required
              />
              <Icon name="star" size={30} />
              <span className="sr-only">{star} sao</span>
            </label>
          ))}
          <span>{rating ? `${rating}/5` : "Chọn điểm"}</span>
        </div>
        <label className="field" htmlFor={`${id}-content`}>
          Kể một chút về bữa ăn của bạn
          <textarea
            id={`${id}-content`}
            name="content"
            required
            rows={5}
            maxLength={2000}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Món ăn, mức giá, không gian hay một điều bạn thích…"
          />
        </label>
        <p className="character-count">{content.length}/2.000 ký tự</p>
        {existing.length > 0 && (
          <div className="existing-images">
            {existing.map((url) => (
              <div key={url}>
                <Photo src={url} alt="Ảnh đã đính kèm review" />
                <button
                  type="button"
                  aria-label="Bỏ ảnh đã đính kèm"
                  onClick={() =>
                    setExisting(existing.filter((value) => value !== url))
                  }
                >
                  <Icon name="close" size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
        <ImageUploader
          files={files}
          onChange={setFiles}
          existingCount={existing.length}
          disabled={busy}
        />
      </fieldset>
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      <p role="status" className="upload-progress">
        {progress}
      </p>
      <div className="form-actions">
        <button
          type="button"
          className="button secondary"
          disabled={busy}
          onClick={() => {
            if (
              (content !== (initial?.content || "") ||
                files.length > 0 ||
                existing.length !== (initial?.images.length || 0) ||
                rating !== (initial?.rating || 0)) &&
              !window.confirm("Bạn muốn đóng và bỏ các thay đổi chưa lưu?")
            )
              return;
            onCancel();
          }}
        >
          Hủy
        </button>
        <button className="button primary" disabled={busy} type="submit">
          {busy ? "Đang lưu…" : initial ? "Lưu thay đổi" : "Đăng đánh giá"}
          <Icon name="arrow" size={16} />
        </button>
      </div>
    </form>
  );
}
