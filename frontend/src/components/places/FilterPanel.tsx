import { useState } from "react";
import type { Area, Category } from "../../types/api";
import { budgets, sortOptions } from "../../hooks/usePlaceFilters";
import type { readFilters } from "../../hooks/usePlaceFilters";
import { Modal } from "../common/Modal";
import { Select } from "../common/Select";
export function FilterPanel({
  filters,
  areas,
  categories,
  onApply,
  onClose,
  includeSort = false,
}: {
  filters: ReturnType<typeof readFilters>;
  areas: Area[];
  categories: Category[];
  onApply: (changes: Record<string, string>) => void;
  onClose: () => void;
  includeSort?: boolean;
}) {
  const [draft, setDraft] = useState({
    area: filters.area,
    category: filters.category,
    budget: filters.budget,
    sort: filters.sort,
  });
  return (
    <Modal title="Tìm đúng quán bạn thích" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const { sort, ...selection } = draft;
          onApply(includeSort ? draft : selection);
          onClose();
        }}
      >
        <p className="form-description">
          Chọn khu vực, món ăn và khoảng chi tiêu. Giá tham khảo theo khoảng giá
          của quán.
        </p>
        <div className="field">
          Khu vực
          <Select label="Khu vực"
            value={draft.area}
            onChange={(value) => setDraft({ ...draft, area: value })}
          >
            <option value="">Toàn Làng Đại học</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="field">
          Danh mục món
          <Select label="Danh mục món"
            value={draft.category}
            onChange={(value) => setDraft({ ...draft, category: value })}
          >
            <option value="">Tất cả món ăn</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        {includeSort && (
          <div className="field">
            Sắp xếp quán
            <Select label="Sắp xếp quán" value={draft.sort}
              onChange={(value) => setDraft({ ...draft, sort: value })}>
              {sortOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </div>
        )}
        <fieldset className="budget-field">
          <legend>Vừa túi tiền của bạn</legend>
          <div className="option-grid">
            {budgets.map((b) => (
              <label
                className={`radio-option ${draft.budget === b.value ? "selected" : ""}`}
                key={b.value}
              >
                <input
                  name="budget"
                  type="radio"
                  value={b.value}
                  checked={draft.budget === b.value}
                  onChange={() => setDraft({ ...draft, budget: b.value })}
                />
                {b.label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="form-actions">
          <button
            type="button"
            className="button secondary"
            onClick={() => setDraft({ area: "", category: "", budget: "", sort: "" })}
          >
            Đặt lại
          </button>
          <button type="submit" className="button primary">
            Áp dụng bộ lọc
          </button>
        </div>
      </form>
    </Modal>
  );
}
