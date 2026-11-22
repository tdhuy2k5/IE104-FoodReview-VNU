export function pageWindow(
  page: number,
  total: number,
): (number | "gap-left" | "gap-right")[] {
  const values: (number | "gap-left" | "gap-right")[] = [];
  const pages = [...new Set([1, page - 1, page, page + 1, total])]
    .filter((n) => n > 0 && n <= total)
    .sort((a, b) => a - b);
  for (let i = 0; i < pages.length; i++) {
    if (i && pages[i] - pages[i - 1] > 1)
      values.push(pages[i] < page ? "gap-left" : "gap-right");
    values.push(pages[i]);
  }
  return values;
}
export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Phân trang">
      <button
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="Trang trước"
      >
        ←
      </button>
      {pageWindow(page, totalPages).map((n) =>
        typeof n === "number" ? (
          <button
            key={n}
            aria-label={`Trang ${n}`}
            aria-current={page === n ? "page" : undefined}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        ) : (
          <span key={n} aria-hidden="true">
            …
          </span>
        ),
      )}
      <button
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="Trang sau"
      >
        →
      </button>
    </nav>
  );
}
