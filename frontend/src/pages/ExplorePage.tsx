import { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";
import { useResource } from "../hooks/useResource";
import { budgets, sortOptions, placeQuery, usePlaceFilters } from "../hooks/usePlaceFilters";
import { Hero } from "../components/places/Hero";
import { SearchBar } from "../components/places/SearchBar";
import { FilterPanel } from "../components/places/FilterPanel";
import { RestaurantCard } from "../components/places/RestaurantCard";
import { Pagination } from "../components/common/Pagination";
import {
  EmptyState,
  ErrorState,
  LoadingCards,
} from "../components/common/States";
import { Icon } from "../components/common/Icon";
import { Select } from "../components/common/Select";
import { FeaturedReviews } from "../components/reviews/FeaturedReviews";

export function ExplorePage({ mapMode = false }: { mapMode?: boolean }) {
  const { filters, key, update, clear } = usePlaceFilters();
  const [filterOpen, setFilterOpen] = useState(false);
  const lookup = useResource(
    useCallback(async (signal: AbortSignal) => {
      const [areas, categories] = await Promise.all([
        api.areas(signal),
        api.categories(signal),
      ]);
      return { areas, categories };
    }, []),
  );
  const places = useResource(
    useCallback(
      (signal: AbortSignal) => api.places(placeQuery(filters), signal),
      [key],
    ),
  );
  const activeCount = [filters.area, filters.category, filters.budget, mapMode ? filters.sort : ""].filter(
    Boolean,
  ).length;
  useEffect(() => {
    if (places.data && filters.page > Math.max(1, places.data.totalPages))
      update({ page: String(Math.max(1, places.data.totalPages)) }, false);
  }, [places.data, filters.page, update]);
  const search = (value: string) => {
    update({ q: value });
    document.getElementById("places-results")?.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
  };
  const pageChange = (page: number) => {
    update({ page: String(page) }, false);
    document
      .getElementById("places-results")
      ?.scrollIntoView({ block: "start", behavior: "instant" });
  };
  const areaName = lookup.data?.areas.find(
    (a) => String(a.id) === filters.area,
  )?.name;
  const catName = lookup.data?.categories.find(
    (c) => String(c.id) === filters.category,
  )?.name;
  return (
    <>
      {!mapMode ? (
        <Hero />
      ) : (
        <section className="container page-heading">
          <span className="eyebrow">Đi một chút, ngon một chút</span>
          <h1>Khám phá <span className="places-title-accent">địa điểm</span></h1>
          <p>Từ KTX Khu A, Khu B đến những góc ăn quen quanh các trường.</p>
        </section>
      )}
      <div
        className={`container search-section ${mapMode ? "search-on-page" : ""}`}
      >
        <SearchBar
          value={filters.search}
          onSearch={search}
          onFilter={() => setFilterOpen(true)}
          activeCount={activeCount}
        />
        <div className="quick-search">
          <span>Thèm gì hôm nay?</span>
          {["Cơm tấm", "Trà sữa", "Bún bò", "Ăn vặt"].map((word) => (
            <button key={word} onClick={() => search(word)}>
              {word}
              <span aria-hidden="true">↗</span>
            </button>
          ))}
        </div>
      </div>
      {!mapMode && <FeaturedReviews />}
      <section className="container results-section" id="places-results">
        {!mapMode && <div className="section-heading places-heading">
          <div>
            <span className="eyebrow">Một vòng Làng Đại học</span>
            <h2>
              {filters.search || activeCount
                ? "Quán hợp gu của bạn"
                : "Ghé quán nào hôm nay?"}
            </h2>
            <p>
              {places.data
                ? `${places.data.totalCount} quán phù hợp · Giá hiển thị là giá tham khảo`
                : "Chọn món ngon, tìm quán gần, xem đánh giá thật."}
            </p>
          </div>
          <div className="sort-select">
            <span>Sắp xếp</span>
            <Select label="Sắp xếp quán"
              value={filters.sort}
              onChange={(value) => update({ sort: value })}
            >
              {sortOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </div>
        </div>}
        {mapMode && lookup.data && (
          <div className="area-tabs" aria-label="Lọc theo khu vực">
            <button
              className={!filters.area ? "selected" : ""}
              aria-pressed={!filters.area}
              onClick={() => update({ area: "" })}
            >
              Toàn khu vực
            </button>
            {lookup.data.areas.map((area) => (
              <button
                key={area.id}
                className={filters.area === String(area.id) ? "selected" : ""}
                aria-pressed={filters.area === String(area.id)}
                onClick={() => update({ area: String(area.id) })}
              >
                {area.name}
              </button>
            ))}
          </div>
        )}
        {(filters.search || activeCount > 0) && (
          <div className="filter-chips" aria-label="Bộ lọc đang áp dụng">
            {[
              { key: "q", label: filters.search },
              { key: "sort", label: mapMode && filters.sort ? sortOptions.find(option => option.value === filters.sort)?.label : "" },
              {
                key: "area",
                label: filters.area ? areaName || "Khu vực đã chọn" : "",
              },
              {
                key: "category",
                label: filters.category ? catName || "Danh mục đã chọn" : "",
              },
              {
                key: "budget",
                label: filters.budget
                  ? budgets.find((b) => b.value === filters.budget)?.label
                  : "",
              },
            ]
              .filter((tag) => tag.label)
              .map((tag) => (
                <button
                  key={tag.key}
                  onClick={() => update({ [tag.key]: "" })}
                  aria-label={`Bỏ bộ lọc ${tag.label}`}
                >
                  {tag.label}
                  <Icon name="close" size={13} />
                </button>
              ))}
            <button className="clear-filters" onClick={clear}>
              Xóa tất cả
            </button>
          </div>
        )}
        <div className={mapMode ? "places-split" : ""}>
          <div aria-busy={places.loading}>
            {places.loading ? (
              <LoadingCards />
            ) : places.error ? (
              <ErrorState error={places.error} onRetry={places.retry} />
            ) : places.data?.items.length ? (
              <>
                <div className="restaurant-grid">
                  {places.data.items.map((place, index) => (
                    <RestaurantCard
                      key={place.id}
                      place={place}
                      priority={index === 0}
                      compact={mapMode}
                    />
                  ))}
                </div>
                <div className="pagination-summary">
                  <span>
                    Trang {places.data.pageIndex} /{" "}
                    {Math.max(1, places.data.totalPages)} · Hiển thị{" "}
                    {places.data.items.length} / {places.data.totalCount} quán
                  </span>
                  <Pagination
                    page={filters.page}
                    totalPages={places.data.totalPages}
                    onChange={pageChange}
                  />
                </div>
              </>
            ) : (
              <EmptyState
                title="Chưa tìm thấy quán hợp ý"
                description="Thử một món khác hoặc nới rộng khu vực, khoảng giá nhé."
              >
                <button className="button primary" onClick={clear}>
                  Xóa bộ lọc
                </button>
              </EmptyState>
            )}
          </div>
          {mapMode && (
            <aside className="location-guide">
              <span className="eyebrow">Hẹn nhau quanh Làng</span>
              <h3>
                Quán ngon,
                <br />
                ngay gần bạn.
              </h3>
              <div className="map-scene" aria-hidden="true">
                <div className="map-road road-one" />
                <div className="map-road road-two" />
                <div className="map-campus">
                  <Icon name="pin" size={30} />
                  <span>LÀNG ĐẠI HỌC</span>
                </div>
              </div>
              <p>
                Sơ đồ minh họa khu vực. Mở chi tiết quán để xem địa chỉ và chỉ
                đường bằng dữ liệu được cung cấp.
              </p>
              <span className="integration-note">
                Bản đồ nhiều quán chưa khả dụng. Xem địa chỉ và chỉ đường tại
                trang chi tiết của từng quán.
              </span>
            </aside>
          )}
        </div>
      </section>
      {filterOpen &&
        (lookup.data ? (
          <FilterPanel
            includeSort={mapMode}
            filters={filters}
            areas={lookup.data.areas}
            categories={lookup.data.categories}
            onApply={update}
            onClose={() => setFilterOpen(false)}
          />
        ) : (
          <div className="filter-status">
            <button
              className="icon-button"
              aria-label="Đóng thông báo bộ lọc"
              onClick={() => setFilterOpen(false)}
            >
              <Icon name="close" />
            </button>
            {lookup.error ? (
              <ErrorState error={lookup.error} onRetry={lookup.retry} />
            ) : (
              <p role="status">Đang tải danh mục và khu vực…</p>
            )}
          </div>
        ))}
    </>
  );
}
