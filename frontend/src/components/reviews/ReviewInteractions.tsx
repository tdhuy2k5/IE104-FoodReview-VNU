import { useState, useSyncExternalStore } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { api } from "../../services/api";
import { errorMessage } from "../../utils/format";
import { Icon } from "../common/Icon";
import { Modal } from "../common/Modal";
import { Select } from "../common/Select";
import "./ReviewInteractions.css";

type Reaction = "like" | "dislike" | null;
const memory = new Map<string, Reaction>();
const eventName = "foodie-review-reaction";
function subscribe(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key) memory.delete(event.key);
    else memory.clear();
    listener();
  };
  window.addEventListener(eventName, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(eventName, listener);
    window.removeEventListener("storage", onStorage);
  };
}
function readReaction(key: string): Reaction {
  if (memory.has(key)) return memory.get(key) ?? null;
  try {
    const value = localStorage.getItem(key);
    return value === "like" || value === "dislike" ? value : null;
  } catch { return memory.get(key) ?? null; }
}

export function ReviewInteractions({ reviewId, authorId }: { reviewId: number; authorId: number }) {
  const { user } = useAuth();
  const location = useLocation();
  const notify = useToast();
  const key = `foodie:review-reaction:${user?.id ?? "guest"}:${reviewId}`;
  const reaction = useSyncExternalStore(subscribe, () => readReaction(key), () => null);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("0");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const react = (value: Exclude<Reaction, null>) => {
    const next = reaction === value ? null : value;
    memory.set(key, next);
    try {
      if (next) localStorage.setItem(key, next);
      else localStorage.removeItem(key);
    } catch { /* The choice remains available in memory when storage is blocked. */ }
    window.dispatchEvent(new Event(eventName));
  };

  return (
    <div className="review-interactions">
      <div className="review-reaction-buttons" role="group" aria-label="Cảm nhận của bạn về đánh giá">
        <button type="button" className="review-reaction" aria-pressed={reaction === "like"} onClick={() => react("like")}>
          <Icon name="thumbUp" size={17} />Thích
        </button>
        <button type="button" className="review-reaction" aria-pressed={reaction === "dislike"} onClick={() => react("dislike")}>
          <Icon name="thumbDown" size={17} />Không thích
        </button>
        {user?.id !== authorId && (user ? (
          <button type="button" className="review-report" onClick={() => { setError(""); setReporting(true); }}>
            <Icon name="flag" size={15} />Báo cáo
          </button>
        ) : (
          <Link className="review-report" aria-label="Đăng nhập để báo cáo"
            to={`/dang-nhap?next=${encodeURIComponent(location.pathname + location.search)}`}><Icon name="flag" size={15} />Báo cáo</Link>
        ))}
      </div>
      <small className="review-reaction-note">Thích / không thích: lựa chọn riêng trên thiết bị.</small>
      {reporting && (
        <Modal title="Báo cáo đánh giá" busy={busy} onClose={() => { if (!busy) setReporting(false); }}>
          <form onSubmit={async event => {
            event.preventDefault();
            if (busy) return;
            setBusy(true); setError("");
            try {
              await api.report(reviewId, Number(reason), description.trim());
              notify("Đã gửi báo cáo đến quản trị viên.");
              setReporting(false); setReason("0"); setDescription("");
            } catch (err) { setError(errorMessage(err)); }
            finally { setBusy(false); }
          }}>
            <p className="form-description">Giúp cộng đồng giữ thông tin hữu ích và tôn trọng nhau.</p>
            <div className="field">Lý do
              <Select label="Lý do báo cáo" value={reason} disabled={busy} onChange={setReason}>
                <option value="0">Spam, quảng cáo</option><option value="1">Nội dung không phù hợp</option>
                <option value="2">Thông tin sai lệch</option><option value="3">Lý do khác</option>
              </Select>
            </div>
            <label className="field">Mô tả thêm (không bắt buộc)
              <textarea maxLength={500} rows={3} disabled={busy} value={description} onChange={event => setDescription(event.target.value)} />
            </label>
            {error && <p className="field-error" role="alert">{error}</p>}
            <div className="form-actions">
              <button type="button" className="button secondary" disabled={busy} onClick={() => setReporting(false)}>Hủy</button>
              <button className="button primary" disabled={busy}>{busy ? "Đang gửi…" : "Gửi báo cáo"}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
