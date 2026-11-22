import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import type { Place, Review } from "../../src/types/api";

test("review reactions toggle exclusively, persist locally and sync across views", async ({ page }) => {
  await fixtures(page);
  await page.goto("/");
  const card = page.locator(".featured-review-card").first();
  const like = card.getByRole("button", { name: "Thích", exact: true });
  const dislike = card.getByRole("button", { name: "Không thích", exact: true });
  await like.click();
  await expect(like).toHaveAttribute("aria-pressed", "true");
  await dislike.click();
  await expect(like).toHaveAttribute("aria-pressed", "false");
  await expect(dislike).toHaveAttribute("aria-pressed", "true");
  await dislike.click();
  await expect(dislike).toHaveAttribute("aria-pressed", "false");
  await like.click();
  await card.locator(".featured-review-open").click();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Thích", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await page.goto("/quan/quan-1");
  await expect(page.locator(".review-card").getByRole("button", { name: "Thích", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.locator(".review-card").getByRole("button", { name: "Thích", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".review-card").getByRole("link", { name: "Đăng nhập để báo cáo" })).toBeVisible();
});

test("featured report submits real payload and keeps errors visible", async ({ page }) => {
  const state = await fixtures(page);
  await page.goto("/dang-nhap");
  await page.getByLabel("Email", { exact: true }).fill("test@example.com");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("test-password");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.locator(".user-trigger")).toBeVisible();
  await page.locator(".featured-review-card").first().getByRole("button", { name: "Báo cáo", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox").click();
  await dialog.getByRole("option", { name: "Thông tin sai lệch", exact: true }).click();
  await dialog.getByRole("textbox").fill("Please check the meal details.");
  await page.route("**/api/reviews/9/report", route => route.fulfill({ status: 503, body: "Unavailable" }));
  await dialog.getByRole("button", { name: "Gửi báo cáo", exact: true }).click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await expect(dialog).toBeVisible();
  await page.unroute("**/api/reviews/9/report");
  await dialog.getByRole("button", { name: "Gửi báo cáo", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(state.writes.some(write => write.path === "/api/reviews/9/report" && (write.body as { reason: number }).reason === 2)).toBe(true);
});

test("clickable controls use pointer and search focus highlights the whole bar", async ({ page }) => {
  test.setTimeout(60000);
  await fixtures(page);
  for (const path of ["/", "/dia-diem", "/cong-dong", "/lien-he", "/dang-nhap", "/dang-ky", "/quan/quan-1", "/thong-tin"]) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await page.locator("h1").first().waitFor();
    const violations = await page.locator('button, a[href], [role="button"], [role="option"], select, input[type="radio"], input[type="checkbox"], input[type="file"]').evaluateAll(elements => elements.filter(el => {
      const visible = el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
      return visible && !el.matches(":disabled, [aria-disabled=true]") && getComputedStyle(el).cursor !== "pointer";
    }).map(el => ({ tag: el.tagName, text: el.textContent?.slice(0, 70), cursor: getComputedStyle(el).cursor })));
    expect(violations, path).toEqual([]);
    if (path === "/" || path === "/dia-diem") {
      const input = page.getByRole("searchbox");
      await input.click();
      await expect(page.locator(".search-bar")).toHaveCSS("border-top-color", "rgb(114, 156, 97)");
      await expect(input).toHaveCSS("cursor", "text");
      await expect(input).toHaveCSS("outline-style", "none");
      await page.locator(".search-bar").screenshot({ path: `test-results/search-focused-${path === "/" ? "home" : "places"}.png` });
      await page.locator("h1").click();
      await expect(page.locator(".search-bar")).toHaveCSS("border-top-color", "rgb(215, 221, 204)");
    }
  }
  await page.goto("/dia-diem");
  await page.locator(".filter-trigger").click();
  await page.getByRole("dialog").getByRole("combobox").first().click();
  for (const option of await page.getByRole("option").all()) await expect(option).toHaveCSS("cursor", "pointer");
  await page.keyboard.press("Escape");
  for (const radio of await page.getByRole("radio").all()) await expect(radio).toHaveCSS("cursor", "pointer");
});

test("featured review opens full text, browses photos and restores keyboard focus", async ({ page }) => {
  await fixtures(page);
  const content = "A warm meal after class. ".repeat(12);
  await page.route("**/api/reviews/place/*?*", route => route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: {
    items: [{ id: 501, placeId: 1, status: 1, rating: 5, content, author: { id: 77, displayName: "Review author" }, createdAt: "2026-11-18T00:00:00Z", images: [
      { id: 1, imageUrl: "/uploads/featured-1.png", altText: "First meal photo" },
      { id: 2, imageUrl: "/uploads/featured-2.png", altText: "Second meal photo" },
    ] }], totalCount: 1, pageIndex: 1, totalPages: 1,
  } }) }));
  await page.route("**/uploads/featured-*.png", route => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40" fill="orange"/></svg>' }));
  await page.goto("/");
  const open = page.locator(".featured-review-open").first();
  await expect(open).toContainText("...");
  await open.focus();
  await open.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator(".featured-review-full-content")).toHaveText(content.trim());
  await expect(dialog.getByRole("img", { name: "First meal photo" })).toBeVisible();
  await dialog.getByRole("button", { name: "Ảnh tiếp theo" }).click();
  await expect(dialog.getByRole("img", { name: "Second meal photo" })).toBeVisible();
  await expect(dialog.getByRole("status")).toHaveText("2 / 2");
  await dialog.getByRole("button", { name: "Ảnh trước" }).click();
  await expect(dialog.getByRole("status")).toHaveText("1 / 2");
  await page.setViewportSize({ width: 390, height: 900 });
  await dialog.screenshot({ path: "test-results/featured-review-dialog.png" });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(open).toBeFocused();
  await page.locator(".featured-review-read-more").first().click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("link").click();
  await expect(page).toHaveURL(/\/quan\/quan-1$/);
  await expect(dialog).toHaveCount(0);
});

test("places sorting lives in filters and applies only on submit", async ({ page }) => {
  await fixtures(page);
  await page.goto("/dia-diem?page=2");
  await expect(page.locator(".places-heading")).toHaveCount(0);
  await expect(page.getByRole("combobox")).toHaveCount(0);
  await page.getByRole("button", { name: "Bộ lọc", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const sort = dialog.getByRole("combobox", { name: "Sắp xếp quán", exact: true });
  await sort.click();
  await dialog.getByRole("option", { name: "Điểm đánh giá cao", exact: true }).click();
  await expect(page).not.toHaveURL(/sort=/);
  await dialog.getByRole("button", { name: "Áp dụng bộ lọc" }).click();
  await expect(page).toHaveURL(/sort=rating/);
  await expect(page).not.toHaveURL(/page=2/);
  await expect(page.locator(".filter-chips")).toContainText("Điểm đánh giá cao");
  await page.locator(".filter-trigger").click();
  await expect(sort).toContainText("Điểm đánh giá cao");
  await dialog.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(sort).toContainText("Được đánh giá nhiều");
  await expect(page).toHaveURL(/sort=rating/);
  await dialog.getByRole("button", { name: "Áp dụng bộ lọc" }).click();
  await expect(page).not.toHaveURL(/sort=/);
  await page.goto("/");
  await expect(page.locator(".places-heading [role=combobox]")).toBeVisible();
});

test("featured reviews follow search and show only published high ratings", async ({ page }) => {
  await fixtures(page);
  await page.route("**/api/reviews/place/*?*", route => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: {
      items: [
        { id: 101, placeId: 1, status: 0, rating: 5, content: "Pending review must stay hidden" },
        { id: 102, placeId: 1, status: 1, rating: 3, content: "Low rating must stay hidden" },
        { id: 103, placeId: 1, status: 1, rating: 4, content: "Published featured experience", author: { id: 99, displayName: "Featured author" }, createdAt: "2026-11-18T00:00:00Z" },
      ], totalCount: 3, pageIndex: 1, totalPages: 1,
    } }),
  }));
  await page.goto("/");
  const featured = page.locator(".featured-reviews");
  await expect(featured.getByText("Published featured experience")).toBeVisible();
  await expect(featured.locator("article")).toHaveCount(1);
  await expect(featured.getByText("Pending review must stay hidden")).toHaveCount(0);
  await expect(featured.getByText("Low rating must stay hidden")).toHaveCount(0);
  expect(await featured.evaluate(el => el.previousElementSibling?.classList.contains("search-section") && el.nextElementSibling?.id === "places-results")).toBe(true);
  await expect(page.locator(".community-preview")).toHaveCount(0);
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await featured.screenshot({ path: `test-results/featured-reviews-${width}.png` });
  }
  await featured.locator(".featured-review-place").click();
  await expect(page).toHaveURL(/\/quan\/quan-1$/);
  await page.goto("/dia-diem");
  await expect(featured).toHaveCount(0);
});

test("featured reviews distinguish unavailable data from no reviews", async ({ page }) => {
  await fixtures(page);
  await page.route("**/api/reviews/place/*?*", route => route.fulfill({ status: 503, body: "Unavailable" }));
  await page.goto("/");
  const featured = page.locator(".featured-reviews");
  await expect(featured.getByRole("status")).toBeVisible();
  await page.unroute("**/api/reviews/place/*?*");
  await page.route("**/api/reviews/place/*?*", route => route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: { items: [], totalCount: 0, pageIndex: 1, totalPages: 0 } }) }));
  await featured.locator("button").click();
  await expect(featured.locator(".featured-review-state")).toContainText("Chưa có đánh giá nổi bật");
  await expect(featured.locator("article")).toHaveCount(0);
});

test("shared dropdown supports keyboard, selected rows and dismissal", async ({ page }) => {
  await fixtures(page);
  await page.goto("/");
  const select = page.locator(".sort-select [role=combobox]");
  await select.focus();
  await select.press("ArrowDown");
  await expect(select).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(".select-option[aria-selected=true]")).toHaveCount(1);
  await expect(select.locator(".dropdown-arrow")).toHaveCSS("border-radius", "50%");
  await expect(page.getByRole("option").first()).toHaveCSS("cursor", "pointer");
  await select.press("End");
  await select.press("Enter");
  await expect(page).toHaveURL(/sort=newest/);
  await expect(select).toHaveAttribute("aria-expanded", "false");
  await select.click();
  await select.press("Escape");
  await expect(select).toHaveAttribute("aria-expanded", "false");
  await expect(select).toBeFocused();
  await select.click();
  await page.locator(".places-heading h2").click();
  await expect(select).toHaveAttribute("aria-expanded", "false");
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await select.click();
    const fits = await page.locator(".select-options").evaluate(el => {
      const box = el.getBoundingClientRect();
      return box.left >= 0 && box.right <= innerWidth;
    });
    expect(fits).toBe(true);
    await page.locator(".places-heading").screenshot({ path: `test-results/dropdown-${width}.png` });
    await select.press("Escape");
  }
  await expect(page.locator(".site-footer")).toHaveCSS("border-top-width", "1px");
});

async function fixtures(page: Page) {
  // Test-only interception. These fixtures never enter the application bundle or database.
  const places: Place[] = Array.from({ length: 14 }, (_, index) => ({
    id: index + 1,
    name: index === 0 ? "Cơm Tấm Cây Bàng" : `Góc ngon kiểm thử ${index + 1}`,
    slug: `quan-${index + 1}`,
    description: "Dữ liệu kiểm thử UI, không phải dữ liệu Backend thực tế.",
    address: "Địa chỉ kiểm thử, KTX Khu B",
    areaId: 2,
    areaName: "KTX Khu B",
    categoryId: 1,
    categoryName: "Cơm Trưa / Cơm Tấm",
    priceMin: 25000,
    priceMax: 40000,
    openingHours: "06:30 - 21:00",
    coverImageUrl:
      "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=700&q=80",
    averageRating: 4.5,
    reviewCount: 1,
    status: 1,
  }));
  let user = {
    id: 10,
    email: "test@example.com",
    displayName: "Bạn Kiểm Thử",
    role: "User",
    createdAt: "2026-01-01T00:00:00Z",
    totalReviews: 1,
    totalFavorites: 0,
  };
  const saved = new Set<number>();
  const review: Review = {
    id: 9,
    placeId: 1,
    placeName: places[0].name,
    rating: 5,
    content: "Một bữa ăn đáng nhớ quanh Làng Đại học.",
    status: 1,
    author: { id: 20, displayName: "Người đánh giá" },
    createdAt: "2026-11-18T00:00:00Z",
    updatedAt: "2026-11-18T00:00:00Z",
    images: [],
  };
  let reviews = [review];
  const writes: { path: string; method: string; body: unknown }[] = [];
  let failed = false,
    hidden = false;
  await page.route("**/api/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      path = url.pathname,
      method = req.method();
    let data: unknown;
    const ok = (value: unknown) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Test fixture",
          data: value,
        }),
      });
    if (method !== "GET")
      writes.push({
        path,
        method,
        body: path.includes("/upload") ? "multipart" : req.postDataJSON(),
      });
    if (failed)
      return route.fulfill({
        status: 503,
        contentType: "text/html",
        body: "<p>Test failure</p>",
      });
    if (path === "/api/areas")
      data = [{ id: 2, name: "KTX Khu B", placeCount: places.length }];
    else if (path === "/api/categories")
      data = [
        {
          id: 1,
          name: "Cơm Trưa / Cơm Tấm",
          slug: "com",
          placeCount: places.length,
        },
      ];
    else if (path === "/api/auth/login" || path === "/api/auth/register") {
      const body = req.postDataJSON();
      if (body.password === "wrong")
        return route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            message: "Email hoặc mật khẩu không chính xác.",
          }),
        });
      data = {
        ...user,
        token:
          "eyJhbGciOiJIUzI1NiJ9." +
          Buffer.from(
            JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }),
          ).toString("base64url") +
          ".test-only-signature",
      };
    } else if (path === "/api/auth/me")
      data = { ...user, totalFavorites: saved.size };
    else if (path === "/api/auth/profile") {
      user = { ...user, ...req.postDataJSON() };
      data = user;
    } else if (path === "/api/favorites")
      data = places.filter((p) => saved.has(p.id));
    else if (/\/places\/\d+\/favorite$/.test(path)) {
      const id = Number(path.split("/")[3]);
      saved.has(id) ? saved.delete(id) : saved.add(id);
      data = { isFavorite: saved.has(id) };
    } else if (path.includes("/places/slug/")) {
      const place =
        places.find((p) => p.slug === path.split("/").at(-1)) || places[0];
      data = {
        ...place,
        status: hidden ? 2 : 1,
        latitude: 10.8801,
        longitude: 106.7792,
        isFavorite: saved.has(place.id),
        menuItems: [{ id: 1, name: "Cơm sườn nướng", price: 28000 }],
        recentReviews: reviews,
      };
    } else if (path === "/api/upload")
      data = { url: "/uploads/test-image.webp" };
    else if (path.endsWith("/report")) data = { id: 40, status: 0 };
    else if (path.startsWith("/api/reviews/place/") && method === "POST") {
      const input = req.postDataJSON();
      const created = {
        ...review,
        ...input,
        id: 30,
        author: { id: user.id, displayName: user.displayName },
        images: [],
      };
      reviews = [created, ...reviews];
      data = created;
    } else if (/\/reviews\/\d+$/.test(path) && method === "PUT") {
      const id = Number(path.split("/").at(-1));
      reviews = reviews.map((r) =>
        r.id === id
          ? { ...r, ...req.postDataJSON(), updatedAt: new Date().toISOString() }
          : r,
      );
      data = reviews.find((r) => r.id === id);
    } else if (/\/reviews\/\d+$/.test(path) && method === "DELETE") {
      reviews = reviews.filter((r) => r.id !== Number(path.split("/").at(-1)));
      data = true;
    } else if (path.startsWith("/api/reviews/")) {
      const items = path.endsWith("/my")
        ? reviews.filter((r) => r.author.id === user.id)
        : reviews;
      data = {
        items,
        totalCount: items.length,
        pageIndex: 1,
        pageSize: 5,
        totalPages: items.length ? 1 : 0,
      };
    } else if (path === "/api/places") {
      const search = (url.searchParams.get("Search") || "").toLowerCase();
      const list = places.filter((p) => p.name.toLowerCase().includes(search));
      const pageIndex = Number(url.searchParams.get("PageIndex") || 1);
      const pageSize = Number(url.searchParams.get("PageSize") || 6);
      data = {
        items: list.slice((pageIndex - 1) * pageSize, pageIndex * pageSize),
        totalCount: list.length,
        pageIndex,
        pageSize,
        totalPages: Math.ceil(list.length / pageSize),
      };
    } else
      return route.fulfill({
        status: 404,
        body: JSON.stringify({
          success: false,
          message: "No test fixture for route",
        }),
      });
    return ok(data);
  });
  return {
    writes,
    fail: () => {
      failed = true;
    },
    hide: () => {
      hidden = true;
    },
    saved,
  };
}
test("search, empty results, real pagination, filters and Back preserve URL state", async ({
  page,
}) => {
  await fixtures(page);
  await page.goto("/");
  await expect(
    page.getByRole("navigation", { name: "Phân trang" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Trang 2", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(
    page.getByRole("heading", { name: "Góc ngon kiểm thử 7" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Góc ngon kiểm thử 7", exact: true })
    .click();
  await page.getByRole("link", { name: "← Quay lại danh sách" }).click();
  await expect(page).toHaveURL(/page=2/);
  await page.getByRole("searchbox").fill("Cơm");
  await page.getByRole("button", { name: "Tìm quán", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Cơm Tấm Cây Bàng" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Phân trang" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Bộ lọc", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Khu vực", exact: true })
    .click();
  await page.getByRole("option", { name: "KTX Khu B", exact: true }).click();
  await page.getByLabel("Đến 30.000đ", { exact: true }).check();
  await page.getByRole("button", { name: "Áp dụng bộ lọc" }).click();
  await expect(page).toHaveURL(/budget=under30/);
  await page.getByRole("searchbox").fill("zzzz");
  await page.getByRole("button", { name: "Tìm quán", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Chưa tìm thấy quán hợp ý" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Trang sau" })).toHaveCount(0);
});
test("login errors, favorites, profile, write/edit/delete review and report", async ({
  page,
}) => {
  const state = await fixtures(page);
  await page.goto("/dang-nhap");
  await page.getByLabel("Email", { exact: true }).fill("test@example.com");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("wrong");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("không chính xác");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("test-password");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Cơm Tấm Cây Bàng" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Lưu Cơm Tấm Cây Bàng", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Bỏ lưu Cơm Tấm Cây Bàng", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .locator(".restaurant-card")
    .getByRole("link", { name: "Cơm Tấm Cây Bàng", exact: true })
    .click();
  await page.getByRole("button", { name: "Chia sẻ trải nghiệm" }).click();
  await page.getByRole("radio", { name: "4 sao", exact: true }).focus();
  await page.getByRole("radio", { name: "4 sao", exact: true }).press("Space");
  await page
    .getByLabel("Kể một chút về bữa ăn của bạn")
    .fill("Review tạo trong kiểm thử tự động.");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Đóng hộp thoại" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.locator('.image-uploader input[type="file"]').setInputFiles({
    name: "review.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6aG8AAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await page
    .getByRole("button", { name: "Đăng đánh giá", exact: true })
    .click();
  await expect(
    page.getByText("Review tạo trong kiểm thử tự động.", { exact: true }),
  ).toBeVisible();
  expect(
    state.writes.find((w) => w.path === "/api/reviews/place/1")?.body,
  ).toMatchObject({
    rating: 4,
    content: "Review tạo trong kiểm thử tự động.",
    imageUrls: ["/uploads/test-image.webp"],
  });
  expect(
    state.writes.some(
      (write) => write.path === "/api/upload" && write.body === "multipart",
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Chỉnh sửa", exact: true }).click();
  await page
    .getByLabel("Kể một chút về bữa ăn của bạn")
    .fill("Review đã chỉnh sửa trong kiểm thử.");
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(
    page.getByText("Review đã chỉnh sửa trong kiểm thử.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Báo cáo", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Lý do báo cáo", exact: true })
    .click();
  await page.getByRole("option", { name: "Thông tin sai lệch", exact: true }).click();
  await page.getByRole("button", { name: "Gửi báo cáo", exact: true }).click();
  expect(state.writes.some((w) => w.path === "/api/reviews/9/report")).toBe(
    true,
  );
  await page.getByRole("button", { name: "Xóa", exact: true }).click();
  await page.getByRole("button", { name: "Xóa đánh giá", exact: true }).click();
  await expect(
    page.getByText("Review đã chỉnh sửa trong kiểm thử.", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: /Bạn Kiểm Thử/ }).click();
  await page.getByRole("link", { name: "Hồ sơ của tôi", exact: true }).click();
  await page.getByLabel("Tên hiển thị", { exact: true }).fill("Tên Mới");
  await page.getByRole("button", { name: "Lưu hồ sơ" }).click();
  await expect(
    page.getByRole("heading", { name: "Chào Tên Mới." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Quán đã lưu", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Cơm Tấm Cây Bàng" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Tên Mới/ }).click();
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(page).toHaveURL(/dang-nhap/);
});
test("card hover keeps text flat and reveals text-link decoration only on interaction", async ({
  page,
}) => {
  await fixtures(page);
  await page.goto("/");
  const card = page.locator(".restaurant-card").first();
  await card.scrollIntoViewIfNeeded();
  const box = (await card.boundingBox())!;
  const contentBox = await card.locator(".card-body").boundingBox();
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.25);
  await expect(card).toHaveCSS("transform", "none");
  await expect(card.locator(".card-body")).toHaveCSS("transform", "none");
  expect(await card.locator(".card-body").boundingBox()).toEqual(contentBox);
  const title = card.locator("h3 a");
  await expect(title).toHaveCSS("text-decoration-line", "none");
  await title.hover();
  await expect(title).toHaveCSS("text-decoration-line", "underline");
  await page.mouse.move(0, 0);
  await expect(title).toHaveCSS("text-decoration-line", "none");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() => card.evaluate((el) => getComputedStyle(el).transform))
    .toBe("none");
  expect(await card.getAttribute("data-tilting")).toBeNull();
  await page.goto("/dia-diem");
  await expect(page.locator(".places-title-accent")).toHaveCSS("color", "rgb(183, 96, 46)");
  await page.locator(".filter-trigger").click();
  const select = page.getByRole("dialog").getByRole("combobox").first();
  const centers = await select.evaluate(el => {
    const text = el.querySelector(".select-value")!.getBoundingClientRect();
    const arrow = el.querySelector(".dropdown-arrow")!.getBoundingClientRect();
    return Math.abs(text.y + text.height / 2 - arrow.y - arrow.height / 2);
  });
  expect(centers).toBeLessThan(1);
});
test("responsive pages fit 390px, 768px and 1440px and keep mobile navigation usable", async ({
  page,
}) => {
  await fixtures(page);
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await expect(page.locator(".restaurant-card").first()).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
    await page.locator("img").evaluateAll(async (images) => {
      await Promise.all(
        images.map((image) => {
          if (!(image instanceof HTMLImageElement)) return;
          image.loading = "eager";
          return image.decode().catch(() => {});
        }),
      );
    });
    await page.screenshot({
      path: `test-results/home-${width}.png`,
      fullPage: true,
    });
    await page.goto("/quan/quan-1");
    await expect(
      page.getByRole("heading", { name: "Cơm Tấm Cây Bàng", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/detail-${width}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Mở menu" }).click();
  await page
    .getByRole("navigation", { name: "Điều hướng trên điện thoại" })
    .getByRole("link", { name: "Cộng đồng" })
    .click();
  await expect(
    page.getByText("Bảng tin cộng đồng đang chờ tích hợp", { exact: true }),
  ).toBeVisible();
});
test("API failures are honest and hidden places are not rendered publicly", async ({
  page,
}) => {
  const state = await fixtures(page);
  state.fail();
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Chưa tải được dữ liệu" }),
  ).toBeVisible();
  await expect(page.locator(".restaurant-card")).toHaveCount(0);
});
test("hidden detail and missing API forms cannot masquerade as successful features", async ({
  page,
}) => {
  const state = await fixtures(page);
  state.hide();
  await page.goto("/quan/quan-1");
  await expect(
    page.getByRole("heading", { name: "Quán chưa được công khai" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Chia sẻ trải nghiệm" }),
  ).toHaveCount(0);
  await page.goto("/lien-he");
  await expect(
    page.getByRole("button", { name: "Chưa hỗ trợ gửi thông tin" }),
  ).toBeDisabled();
  expect(state.writes).toHaveLength(0);
});
