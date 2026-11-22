export const money = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
export const priceRange = (min: number, max: number) =>
  min === max ? money(min) : `${money(min)} – ${money(max)}`;
export function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Chưa có thời gian"
    : new Intl.DateTimeFormat("vi-VN", {
        day: "numeric",
        month: "numeric",
        year: "numeric",
        timeZone: "Asia/Ho_Chi_Minh",
      }).format(date);
}
export function safeReturnTo(value: string | null) {
  return value?.startsWith("/") &&
    !value.startsWith("//") &&
    !/[\\\u0000-\u001f]/.test(value) &&
    !value.startsWith("/dang-")
    ? value
    : "/";
}
export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Có lỗi xảy ra. Vui lòng thử lại.";
export function validateImage(file: File) {
  if (
    !/\.(jpe?g|png|webp)$/i.test(file.name) ||
    !["image/jpeg", "image/png", "image/webp"].includes(file.type)
  )
    return "Chỉ chấp nhận ảnh JPG, PNG hoặc WebP.";
  if (file.size > 5 * 1024 * 1024) return "Mỗi ảnh không được vượt quá 5 MB.";
  if (!file.size) return "Ảnh đã chọn không có dữ liệu.";
  return null;
}
