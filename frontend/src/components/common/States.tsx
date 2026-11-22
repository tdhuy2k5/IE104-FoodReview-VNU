import { Link } from "react-router-dom";
import { Icon } from "./Icon";
import { errorMessage } from "../../utils/format";
export function ErrorState({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  return (
    <div className="state-card error-state" role="alert">
      <span className="state-icon">
        <Icon name="info" size={28} />
      </span>
      <h3>Chưa tải được dữ liệu</h3>
      <p>{errorMessage(error)}</p>
      {onRetry && (
        <button className="button secondary" onClick={onRetry}>
          Thử lại
        </button>
      )}
    </div>
  );
}
export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="state-card">
      <span className="state-icon">
        <Icon name="fork" size={28} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function LoadingCards({ count = 6 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="Đang tải danh sách quán"
      className="restaurant-grid"
    >
      {Array.from({ length: count }, (_, i) => (
        <div className="skeleton-card" key={i}>
          <div className="skeleton skeleton-image" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line short" />
        </div>
      ))}
    </div>
  );
}
export function Unavailable({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="unavailable">
      <Icon name="info" />
      <div>
        <span className="eyebrow">Chưa tích hợp</span>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}
export function LoginPrompt() {
  return (
    <EmptyState
      title="Một góc riêng dành cho bạn"
      description="Đăng nhập để lưu quán, viết đánh giá và quản lý hồ sơ."
    >
      <Link className="button primary" to="/dang-nhap">
        Đăng nhập
      </Link>
    </EmptyState>
  );
}
