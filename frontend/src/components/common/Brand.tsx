import { Link } from "react-router-dom";

const logoUrl = new URL(
  "../../../docs/assets/foodie-review-symbol.png",
  import.meta.url,
).href;

export function Brand({ footer = false }: { footer?: boolean }) {
  return (
    <Link className="brand" to="/" aria-label="Foodie Review, về trang chủ">
      <img
        className="brand-mark"
        src={logoUrl}
        width={46}
        height={46}
        alt=""
        aria-hidden="true"
      />
      <span className="brand-copy">
        <strong>FOODIE REVIEW</strong>
        <small>
          {footer
            ? "Ăn ngon, kể thật, cùng khám phá."
            : "ĐHQG TP.HCM · Làng Đại học"}
        </small>
      </span>
    </Link>
  );
}
