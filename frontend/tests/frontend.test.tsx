import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFilters, placeQuery } from "../src/hooks/usePlaceFilters";
import { pageWindow, Pagination } from "../src/components/common/Pagination";
import { useResource } from "../src/hooks/useResource";
import { ApiError, request, setAccessToken } from "../src/services/http";
import { api } from "../src/services/api";
import { validateImage, safeReturnTo } from "../src/utils/format";
import { ExplorePage } from "../src/pages/ExplorePage";
import { ToastProvider } from "../src/contexts/ToastContext";
import { AuthProvider } from "../src/contexts/AuthContext";
import { FavoritesProvider } from "../src/contexts/FavoritesContext";
import { Modal } from "../src/components/common/Modal";
import type { Place } from "../src/types/api";

const response = (data: unknown, status = 200) =>
  new Response(
    JSON.stringify({
      success: status < 400,
      data,
      message: status < 400 ? "OK" : "Thông tin không hợp lệ",
    }),
    { status, headers: { "Content-Type": "application/json" } },
  );
beforeEach(() => {
  setAccessToken(null);
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("URL filters and pagination regression", () => {
  it("maps budgets and server parameter names without matching formatted price strings", () => {
    const filters = readFilters(
      new URLSearchParams("q=cơm&area=2&budget=30to50&page=4&sort=price_asc"),
    );
    expect(placeQuery(filters)).toMatchObject({
      Search: "cơm",
      AreaId: "2",
      MinPrice: 30000,
      MaxPrice: 50000,
      PageIndex: 4,
      SortBy: "price_asc",
    });
  });
  it("rejects invalid query page and sort inputs", () => {
    expect(
      readFilters(new URLSearchParams("page=-3&area=abc&sort=sql&budget=fake")),
    ).toMatchObject({ page: 1, area: "", sort: "", budget: "" });
  });
  it("supports many result pages and hides pagination for zero or one page", () => {
    expect(pageWindow(500, 1000000)).toEqual([
      1,
      "gap-left",
      499,
      500,
      501,
      "gap-right",
      1000000,
    ]);
    const { rerender } = render(
      <Pagination page={1} totalPages={0} onChange={() => {}} />,
    );
    expect(screen.queryByRole("navigation")).toBeNull();
    rerender(<Pagination page={1} totalPages={1} onChange={() => {}} />);
    expect(screen.queryByRole("navigation")).toBeNull();
  });
});
describe("Backend contract", () => {
  it("uses the actual review route and sends integer rating with image URLs", async () => {
    const fetcher = vi.fn().mockResolvedValue(response({ id: 3 }));
    vi.stubGlobal("fetch", fetcher);
    await api.createReview(8, {
      rating: 4,
      content: "Ngon",
      imageUrls: ["/uploads/test.webp"],
    });
    expect(fetcher.mock.calls[0][0]).toBe("/api/reviews/place/8");
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
      rating: 4,
      content: "Ngon",
      imageUrls: ["/uploads/test.webp"],
    });
  });
  it("uploads a multipart file without overriding its boundary header", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(response({ url: "/uploads/a.jpg" }));
    vi.stubGlobal("fetch", fetcher);
    await api.upload(new File(["photo"], "a.jpg", { type: "image/jpeg" }));
    const init = fetcher.mock.calls[0][1];
    expect(init.body.get("file").name).toBe("a.jpg");
    expect(init.headers.has("Content-Type")).toBe(false);
  });
  it("expires the local session on authenticated 401 responses", async () => {
    setAccessToken("test-only-token");
    const expired = vi.fn();
    window.addEventListener("foodreview:unauthorized", expired);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("", { status: 401 })),
    );
    await expect(request("/auth/me")).rejects.toBeInstanceOf(ApiError);
    expect(expired).toHaveBeenCalledOnce();
    window.removeEventListener("foodreview:unauthorized", expired);
  });
  it("handles ProblemDetails and proxy HTML errors without a JSON parse crash", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ errors: { Content: ["Bắt buộc"] } }), {
            status: 400,
          }),
        )
        .mockResolvedValueOnce(
          new Response("<html>Bad gateway</html>", { status: 502 }),
        ),
    );
    try {
      await request("/reviews");
    } catch (error) {
      expect((error as ApiError).fields).toEqual({ Content: ["Bắt buộc"] });
    }
    await expect(request("/places")).rejects.toThrow("Máy chủ chưa xử lý");
  });
});
describe("Safe forms and request lifecycle", () => {
  it("rejects unsupported and oversized images, accepts a valid WebP", () => {
    expect(
      validateImage(new File(["x"], "x.svg", { type: "image/svg+xml" })),
    ).toContain("JPG");
    expect(
      validateImage(
        new File([new Uint8Array(5 * 1024 * 1024 + 1)], "x.jpg", {
          type: "image/jpeg",
        }),
      ),
    ).toContain("5 MB");
    expect(
      validateImage(new File(["x"], "x.webp", { type: "image/webp" })),
    ).toBeNull();
    expect(safeReturnTo("//untrusted.example")).toBe("/");
    expect(safeReturnTo("/quan/com-tam")).toBe("/quan/com-tam");
  });
  it("aborts a stale request and prevents its response replacing newer results", async () => {
    let oldResolve!: (value: string) => void,
      newResolve!: (value: string) => void;
    const oldLoad = vi.fn(
      (_signal: AbortSignal) =>
        new Promise<string>((resolve) => {
          oldResolve = resolve;
        }),
    );
    const newLoad = vi.fn(
      (_signal: AbortSignal) =>
        new Promise<string>((resolve) => {
          newResolve = resolve;
        }),
    );
    const { result, rerender } = renderHook(({ load }) => useResource(load), {
      initialProps: { load: oldLoad },
    });
    rerender({ load: newLoad });
    expect(oldLoad.mock.calls[0][0].aborted).toBe(true);
    await act(async () => newResolve("new"));
    await waitFor(() => expect(result.current.data).toBe("new"));
    await act(async () => oldResolve("old"));
    expect(result.current.data).toBe("new");
  });
  it("opens an accessible native dialog and returns focus when closed", () => {
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute("open");
    };
    const trigger = document.createElement("button");
    document.body.append(trigger);
    trigger.focus();
    const close = vi.fn();
    const { unmount } = render(
      <Modal title="Bộ lọc" onClose={close}>
        <p>Nội dung</p>
      </Modal>,
    );
    expect(screen.getByRole("dialog", { name: "Bộ lọc" })).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Đóng hộp thoại" }));
    expect(close).toHaveBeenCalledOnce();
    unmount();
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });
});
describe("Explore integration with test-only API fixtures", () => {
  const place: Place = {
    id: 7,
    name: "Quán kiểm thử",
    slug: "quan-kiem-thu",
    categoryId: 1,
    categoryName: "Cơm",
    areaId: 2,
    areaName: "KTX B",
    priceMin: 25000,
    priceMax: 40000,
    averageRating: 4.5,
    reviewCount: 2,
    address: "Địa chỉ kiểm thử",
    status: 1,
  };
  function mount(
    search: string,
    items: Place[],
    totalPages: number,
    failed = false,
  ) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/areas")) return response([]);
        if (url.includes("/categories")) return response([]);
        if (failed) return new Response("Unavailable", { status: 503 });
        return response({
          items,
          pageIndex: 1,
          pageSize: 6,
          totalCount: items.length,
          totalPages,
        });
      }),
    );
    return render(
      <MemoryRouter initialEntries={[`/?q=${search}`]}>
        <ToastProvider>
          <AuthProvider>
            <FavoritesProvider>
              <ExplorePage />
            </FavoritesProvider>
          </AuthProvider>
        </ToastProvider>
      </MemoryRouter>,
    );
  }
  it("shows one filtered restaurant with no stale three-page controls", async () => {
    mount("cơm", [place], 1);
    await screen.findByRole("heading", { name: place.name });
    expect(screen.queryByRole("navigation", { name: "Phân trang" })).toBeNull();
    expect(
      screen.getByText("Trang 1 / 1 · Hiển thị 1 / 1 quán"),
    ).not.toBeNull();
  });
  it("shows a real empty state and no stale next-page button", async () => {
    mount("nothing", [], 0);
    await screen.findByRole("heading", { name: "Chưa tìm thấy quán hợp ý" });
    expect(screen.queryByRole("button", { name: "Trang sau" })).toBeNull();
  });
  it("shows an API failure instead of silently switching to fabricated restaurants", async () => {
    mount("", [], 0, true);
    await screen.findByRole("heading", { name: "Chưa tải được dữ liệu" });
    expect(screen.queryByRole("heading", { name: place.name })).toBeNull();
    expect(screen.getByRole("button", { name: "Thử lại" })).not.toBeNull();
  });
});
