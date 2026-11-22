import type { Envelope } from "../types/api";

const base = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");
let accessToken: string | null = null;
export function setAccessToken(token: string | null) {
  accessToken = token;
}
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fields?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
export async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (init.body && !(init.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, { ...init, headers });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw error;
    throw new ApiError(
      "Chưa kết nối được máy chủ. Vui lòng kiểm tra kết nối hoặc thử lại sau.",
      0,
    );
  }
  const text = await response.text();
  let body:
    | (Partial<Envelope<T>> & {
        title?: string;
        errors?: Record<string, string[]>;
      })
    | undefined;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    /* A proxy may return a non-JSON error. */
  }
  if (!response.ok || body?.success === false) {
    if (response.status === 401 && accessToken)
      window.dispatchEvent(new Event("foodreview:unauthorized"));
    const fallback =
      response.status === 401
        ? "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại."
        : response.status === 403
          ? "Bạn không có quyền thực hiện thao tác này."
          : response.status === 404
            ? "Không tìm thấy nội dung bạn yêu cầu."
            : response.status >= 500
              ? "Máy chủ chưa xử lý được yêu cầu. Vui lòng thử lại sau."
              : "Vui lòng kiểm tra thông tin đã nhập.";
    throw new ApiError(
      body?.message || fallback,
      response.status,
      body?.errors,
    );
  }
  if (!body || !("data" in body) || body.success !== true)
    throw new ApiError(
      "Máy chủ trả dữ liệu không đúng định dạng.",
      response.status,
    );
  return body.data as T;
}
export function query(params: Record<string, string | number | undefined>) {
  const result = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") result.set(key, String(value));
  });
  return result.toString();
}
export const json = (body: unknown) => JSON.stringify(body);
export function mediaUrl(value?: string | null): string | undefined {
  if (!value) return undefined;
  try {
    const api = new URL(base, window.location.origin);
    const url = new URL(value, api.origin);
    return ["http:", "https:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}
