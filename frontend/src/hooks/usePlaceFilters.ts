import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
export const sortOptions = [
  { value: "", label: "Được đánh giá nhiều" },
  { value: "rating", label: "Điểm đánh giá cao" },
  { value: "price_asc", label: "Giá thấp đến cao" },
  { value: "price_desc", label: "Giá cao đến thấp" },
  { value: "newest", label: "Quán mới nhất" },
];
export const budgets = [
  { value: "", label: "Mọi mức giá" },
  { value: "under30", label: "Đến 30.000đ" },
  { value: "30to50", label: "30.000 – 50.000đ" },
  { value: "over50", label: "Từ 50.000đ" },
];
export function positiveInt(value: string | null, fallback = 1) {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 && n <= 1000000 ? n : fallback;
}
export function readFilters(params: URLSearchParams) {
  const budget = budgets.some((b) => b.value === params.get("budget"))
    ? params.get("budget") || ""
    : "";
  const sort = ["rating", "price_asc", "price_desc", "newest"].includes(
    params.get("sort") || "",
  )
    ? params.get("sort")!
    : "";
  return {
    search: (params.get("q") || "").slice(0, 200),
    area: params.get("area")
      ? String(positiveInt(params.get("area"), 0) || "")
      : "",
    category: params.get("category")
      ? String(positiveInt(params.get("category"), 0) || "")
      : "",
    budget,
    sort,
    page: positiveInt(params.get("page")),
  };
}
export function placeQuery(filters: ReturnType<typeof readFilters>) {
  return {
    Search: filters.search,
    AreaId: filters.area,
    CategoryId: filters.category,
    SortBy: filters.sort,
    PageIndex: filters.page,
    PageSize: 6,
    MinPrice:
      filters.budget === "30to50"
        ? 30000
        : filters.budget === "over50"
          ? 50000
          : undefined,
    MaxPrice:
      filters.budget === "under30"
        ? 30000
        : filters.budget === "30to50"
          ? 50000
          : undefined,
  };
}
export function usePlaceFilters() {
  const [params, setParams] = useSearchParams();
  const filters = readFilters(params),
    key = params.toString();
  const update = useCallback(
    (changes: Record<string, string>, resetPage = true) => {
      setParams((previous) => {
        const next = new URLSearchParams(previous);
        if (resetPage) next.delete("page");
        Object.entries(changes).forEach(([k, v]) => {
          if (v) next.set(k, v);
          else next.delete(k);
        });
        return next;
      });
    },
    [setParams],
  );
  const clear = () => setParams({});
  return { filters, key, update, clear };
}
