import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "../common/Icon";
export function SearchBar({
  value,
  onSearch,
  onFilter,
  activeCount,
}: {
  value: string;
  onSearch: (value: string) => void;
  onFilter: () => void;
  activeCount: number;
}) {
  const [search, setSearch] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  useEffect(() => setSearch(value), [value]);
  return (
    <form
      className="search-bar"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(search.trim());
      }}
    >
      <div className="search-input">
        <Icon name="search" />
        <label className="sr-only" htmlFor={inputId}>Tìm món ăn hoặc tên quán</label>
        <input
          ref={inputRef}
          id={inputId}
          name="q"
          type="search"
          autoComplete="off"
          placeholder="Hôm nay bạn muốn ăn gì?"
          value={search}
          maxLength={200}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search.length > 0 && (
          <button
            type="button"
            className="search-clear"
            aria-label="Xóa nội dung tìm kiếm"
            onClick={() => {
              setSearch("");
              inputRef.current?.focus();
            }}
          >
            <Icon name="close" size={15} />
          </button>
        )}
      </div>
      <div className="search-actions">
        <button type="button" className="filter-trigger" onClick={onFilter}>
          <Icon name="filter" size={18} />
          <span>Bộ lọc</span>
          {activeCount > 0 && (
            <span className="filter-count">{activeCount}</span>
          )}
        </button>
        <button className="button primary search-submit" type="submit">
          Tìm quán
          <Icon name="arrow" size={17} />
        </button>
      </div>
    </form>
  );
}
