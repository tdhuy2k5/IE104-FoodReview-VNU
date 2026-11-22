import { useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { api } from "../services/api";
import { ApiError } from "../services/http";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { errorMessage, safeReturnTo } from "../utils/format";
import { Icon } from "../components/common/Icon";
export function AuthPage({ register = false }: { register?: boolean }) {
  const [params] = useSearchParams(),
    { user, accept } = useAuth(),
    notify = useToast();
  const next = safeReturnTo(params.get("next"));
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [fieldErrors, setFieldErrors] = useState<string[]>([]);
  if (user) return <Navigate to={next} replace />;
  return (
    <div className="container auth-layout">
      <aside className="auth-story">
        <span className="eyebrow">Một chiếc tài khoản, nhiều quán ngon</span>
        <h1>
          {register ? (
            <>
              Bữa ngon mới,
              <br />
              bạn bè mới.
            </>
          ) : (
            <>
              Quán ruột
              <br />
              đang đợi bạn.
            </>
          )}
        </h1>
        <p>
          Lưu những nơi muốn ghé. Kể về bữa ăn vừa thử. Cùng nhau làm nên cuốn
          cẩm nang của Làng Đại học.
        </p>
        <div className="auth-stamp">
          <Icon name="fork" size={58} />
          <span>
            ĂN NGON
            <br />
            KỂ THẬT
          </span>
        </div>
        <Link className="back-link" to="/">
          ← Tiếp tục khám phá
        </Link>
      </aside>
      <section className="auth-card">
        <span className="eyebrow">Chào bạn ghé Làng</span>
        <h2>{register ? "Tạo tài khoản" : "Mừng bạn quay lại"}</h2>
        <p className="form-description">
          {register
            ? "Chỉ vài thông tin để bắt đầu chia sẻ."
            : "Đăng nhập để tiếp tục hành trình ăn ngon."}
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            const data = new FormData(e.currentTarget);
            setBusy(true);
            setError("");
            setFieldErrors([]);
            try {
              const email = String(data.get("email")).trim(),
                password = String(data.get("password"));
              const displayName = String(data.get("displayName") || "").trim();
              if (register && !displayName)
                throw Error("Vui lòng nhập tên hiển thị.");
              const result = register
                ? await api.register(email, password, displayName)
                : await api.login(email, password);
              await accept(result);
              notify(
                register
                  ? "Tài khoản đã được tạo. Chào mừng bạn!"
                  : "Đăng nhập thành công. Chúc bạn tìm được quán ngon!",
              );
            } catch (err) {
              setError(errorMessage(err));
              if (err instanceof ApiError && err.fields)
                setFieldErrors(Object.values(err.fields).flat());
            } finally {
              setBusy(false);
            }
          }}
        >
          {register && (
            <label className="field">
              Tên hiển thị
              <input
                name="displayName"
                autoComplete="nickname"
                maxLength={100}
                required
                disabled={busy}
                placeholder="Bạn muốn mọi người gọi là gì?"
              />
            </label>
          )}
          <label className="field">
            Email
            <input
              name="email"
              type="email"
              autoComplete="email"
              spellCheck={false}
              required
              disabled={busy}
              placeholder="ban@example.com"
            />
          </label>
          <label className="field">
            Mật khẩu
            <input
              name="password"
              type="password"
              autoComplete={register ? "new-password" : "current-password"}
              minLength={register ? 6 : undefined}
              required
              disabled={busy}
              placeholder={register ? "Ít nhất 6 ký tự" : "Mật khẩu của bạn"}
            />
          </label>
          {error && (
            <div className="field-error" role="alert">
              <p>{error}</p>
              {fieldErrors.length > 0 && (
                <ul>
                  {fieldErrors.map((message, i) => (
                    <li key={i}>{message}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <button
            className="button primary full-width"
            disabled={busy}
            type="submit"
          >
            {busy ? "Đang xử lý…" : register ? "Tạo tài khoản" : "Đăng nhập"}
            <Icon name="arrow" size={18} />
          </button>
        </form>
        <p className="auth-switch">
          {register ? "Đã có tài khoản?" : "Chưa có tài khoản?"}{" "}
          <Link
            to={`${register ? "/dang-nhap" : "/dang-ky"}?next=${encodeURIComponent(next)}`}
          >
            {register ? "Đăng nhập" : "Đăng ký ngay"}
          </Link>
        </p>
        <p className="session-note">
          <Icon name="info" size={15} />
          Phiên đăng nhập chỉ được giữ trong tab hiện tại. Tải lại trang sẽ cần
          đăng nhập lại.
        </p>
      </section>
    </div>
  );
}
