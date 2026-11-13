/**
 * Danh sách / bộ lọc / chi tiết địa điểm.
 */
const Places = (() => {
  const state = {
    areas: [],
    categories: [],
    page: 1,
    pageSize: 9,
    totalPages: 1,
    currentId: null,
  };

  // Backend PostgreSQL lưu tên icon (utensils, soup, ...), frontend ánh xạ sang emoji.
  const CATEGORY_ICONS = {
    utensils: '🍚',
    soup: '🍜',
    flame: '🍢',
    coffee: '🧋',
    pot: '🍲',
    leaf: '🥗',
  };

  function iconFor(categoryId) {
    const category = state.categories.find((item) => item.id === Number(categoryId));
    const raw = String(category?.icon || '').trim();
    if (!raw) return '🍽️';

    const mapped = CATEGORY_ICONS[raw.toLowerCase()];
    if (mapped) return mapped;

    // Tương thích ngược: nếu icon đã là emoji thì giữ nguyên.
    return /[^\u0000-\u007F]/.test(raw) ? raw : '🍽️';
  }

  function fillSelect(selector, placeholder, items) {
    const select = Utils.$(selector);
    if (!select) return;
    const current = select.value;
    select.innerHTML =
      `<option value="">${Utils.escapeHtml(placeholder)}</option>` +
      items.map((item) => `<option value="${item.id}">${Utils.escapeHtml(item.name)}</option>`).join('');
    if (current) select.value = current;
  }

  async function loadMeta() {
    const [areasRes, categoriesRes] = await Promise.all([
      API.get('/api/Areas', { auth: false }),
      API.get('/api/Categories', { auth: false }),
    ]);
    state.areas = areasRes.data || [];
    state.categories = categoriesRes.data || [];

    fillSelect('#filterArea', 'Tất cả khu vực', state.areas);
    fillSelect('#filterCategory', 'Tất cả danh mục', state.categories);
    fillSelect('#placeArea', 'Chọn khu vực', state.areas);
    fillSelect('#placeCategory', 'Chọn danh mục', state.categories);
  }

  function buildQuery(page) {
    const params = new URLSearchParams();
    const search = Utils.$('#searchInput')?.value.trim();
    const areaId = Utils.$('#filterArea')?.value;
    const categoryId = Utils.$('#filterCategory')?.value;
    const maxPrice = Utils.$('#filterPrice')?.value;
    const minRating = Utils.$('#filterRating')?.value;
    const sortBy = Utils.$('#sortSelect')?.value;

    if (search) params.set('search', search);
    if (areaId) params.set('areaId', areaId);
    if (categoryId) params.set('categoryId', categoryId);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (minRating) params.set('minRating', minRating);
    if (sortBy) params.set('sortBy', sortBy);
    params.set('pageIndex', page);
    params.set('pageSize', state.pageSize);
    return params.toString();
  }

  function cardHtml(item) {
    const cover = Utils.imageUrl(item.coverImageUrl);
    const icon = iconFor(item.categoryId);
    const average = Number(item.averageRating) || 0;

    return `
      <article class="place-card" data-open-place="${item.id}" tabindex="0" role="button"
        aria-label="Xem chi tiết ${Utils.escapeHtml(item.name)}">
        <div class="place-cover">
          <span class="cover-emoji" aria-hidden="true">${icon}</span>
          ${cover ? `<img src="${Utils.escapeHtml(cover)}" alt="" loading="lazy" onerror="this.remove()" />` : ''}
          <span class="place-category">${icon} ${Utils.escapeHtml(item.categoryName)}</span>
        </div>
        <div class="place-body">
          <h3>${Utils.escapeHtml(item.name)}</h3>
          <p class="place-address" title="${Utils.escapeHtml(item.address)}">📍 ${Utils.escapeHtml(item.address)}</p>
          <div class="place-meta">
            <span class="rating-pill">★ ${Utils.rating(average)}</span>
            <span class="muted small">${item.reviewCount} đánh giá</span>
          </div>
          <div class="place-foot">
            <span class="price">${Utils.escapeHtml(Utils.priceRange(item.priceMin, item.priceMax))}</span>
            <span class="muted small">🕒 ${Utils.escapeHtml(item.openingHours || 'Đang cập nhật')}</span>
          </div>
        </div>
      </article>`;
  }

  function renderCards(items, grid, emptyEl) {
    if (!grid) return;
    if (!items || !items.length) {
      grid.innerHTML = '';
      Utils.showEmpty(emptyEl);
      return;
    }
    Utils.hideEmpty(emptyEl);
    grid.innerHTML = items.map(cardHtml).join('');
  }

  function renderPagination(result) {
    const container = Utils.$('#placesPagination');
    if (!container) return;
    if (!result || result.totalPages <= 1) {
      container.innerHTML = '';
      return;
    }
    container.innerHTML = `
      <button class="btn btn-ghost btn-sm" type="button" data-page="${result.pageIndex - 1}"
        ${result.pageIndex <= 1 ? 'disabled' : ''}>‹ Trước</button>
      <span class="page-info">Trang ${result.pageIndex} / ${result.totalPages}</span>
      <button class="btn btn-ghost btn-sm" type="button" data-page="${result.pageIndex + 1}"
        ${result.pageIndex >= result.totalPages ? 'disabled' : ''}>Sau ›</button>`;

    container.querySelectorAll('[data-page]').forEach((button) => {
      button.addEventListener('click', () => load(Number(button.dataset.page)));
    });
  }

  async function load(page = 1) {
    const grid = Utils.$('#placesGrid');
    const empty = Utils.$('#placesEmpty');
    const count = Utils.$('#placesCount');
    if (!grid) return;

    state.page = page;
    grid.innerHTML = Utils.skeletonCards(state.pageSize);
    Utils.hideEmpty(empty);

    try {
      const res = await API.get(`/api/Places?${buildQuery(page)}`);
      const result = res.data || {};
      renderCards(result.items || [], grid, empty);
      if (count) count.textContent = `${result.totalCount || 0} địa điểm`;
      state.totalPages = result.totalPages || 1;
      renderPagination(result);
      Utils.setApiStatus(true);
    } catch (error) {
      grid.innerHTML = '';
      if (count) count.textContent = 'Không tải được dữ liệu';
      Utils.showEmpty(empty, `
        <span class="empty-icon">⚠️</span>
        <h3>Không tải được danh sách địa điểm</h3>
        <p>${Utils.escapeHtml(error.message)}</p>
        <button class="btn btn-primary" type="button" id="emptyReset">Thử lại</button>`);
      renderPagination(null);
      Utils.setApiStatus(Boolean(error.status));
      Utils.toast(error.message, 'error', 5000);
    }
  }

  function menuHtml(place) {
    const items = place.menuItems || [];
    if (!items.length) return '<p class="muted">Chưa có thực đơn.</p>';
    return `<ul class="menu-list">${items.map((item) => `
      <li class="menu-item">
        <div>
          <strong>${Utils.escapeHtml(item.name)}</strong>
          ${item.note ? `<small>${Utils.escapeHtml(item.note)}</small>` : ''}
        </div>
        <span class="price">${Utils.money(item.price)}</span>
      </li>`).join('')}</ul>`;
  }

  function detailHtml(place, reviews, totalReviews) {
    const cover = Utils.imageUrl(place.coverImageUrl);
    const icon = iconFor(place.categoryId);
    const isFavorite = !!place.isFavorite;
    const loggedIn = Auth.isLoggedIn();

    return `
      <div class="detail-cover">
        <span class="cover-emoji" aria-hidden="true">${icon}</span>
        ${cover ? `<img src="${Utils.escapeHtml(cover)}" alt="" onerror="this.remove()" />` : ''}
        <div class="detail-cover-overlay"></div>
        <span class="place-category">${icon} ${Utils.escapeHtml(place.categoryName)}</span>
      </div>
      <div class="detail-body">
        <div class="detail-title">
          <div>
            <p class="eyebrow">${Utils.escapeHtml(place.areaName)}</p>
            <h2>${Utils.escapeHtml(place.name)}</h2>
          </div>
          <button class="btn ${isFavorite ? 'btn-fav-active' : 'btn-ghost'}" type="button"
            data-action="favorite" data-id="${place.id}">
            ${isFavorite ? '♥ Đã lưu' : '♡ Lưu quán'}
          </button>
        </div>

        <div class="detail-stats">
          <span class="rating-pill">★ ${Utils.rating(place.averageRating)}</span>
          <span>${place.reviewCount} đánh giá</span>
          <span>🕒 ${Utils.escapeHtml(place.openingHours || 'Đang cập nhật')}</span>
        </div>
        <p class="detail-line">📍 ${Utils.escapeHtml(place.address)}</p>
        <p class="detail-line">💰 ${Utils.escapeHtml(Utils.priceRange(place.priceMin, place.priceMax))}</p>
        ${place.description ? `<p class="detail-desc">${Utils.escapeHtml(place.description)}</p>` : ''}

        <h3 class="section-title">Thực đơn</h3>
        ${menuHtml(place)}

        <h3 class="section-title">Đánh giá <span class="muted">(${totalReviews})</span></h3>
        ${reviews.length
          ? `<div class="review-list">${Reviews.listHtml(reviews, { showPlace: false })}</div>`
          : '<p class="muted">Chưa có đánh giá nào. Hãy là người đầu tiên!</p>'}
        ${loggedIn
          ? Reviews.formHtml(place.id)
          : `<div class="login-prompt">
               <span>Đăng nhập để viết đánh giá và lưu quán yêu thích.</span>
               <button class="btn btn-primary btn-sm" type="button" data-open-auth="login">Đăng nhập</button>
             </div>`}
      </div>`;
  }

  async function openDetail(id) {
    state.currentId = Number(id);
    const container = Utils.$('#placeDetail');
    Utils.openModal('placeModal');
    if (container) {
      container.innerHTML = `
        <div class="detail-loading">
          <div class="spinner" aria-hidden="true"></div>
          <p>Đang tải địa điểm...</p>
        </div>`;
    }

    try {
      const [placeRes, reviewsRes] = await Promise.all([
        API.get(`/api/Places/${id}`),
        API.get(`/api/Reviews/place/${id}?page=1&pageSize=50`, { auth: false }),
      ]);
      const place = placeRes.data;
      const reviewPage = reviewsRes.data || {};
      const reviews = reviewPage.items || [];
      if (container) {
        container.innerHTML = detailHtml(place, reviews, reviewPage.totalCount ?? reviews.length);
      }
      Utils.setApiStatus(true);
    } catch (error) {
      if (container) {
        container.innerHTML = `
          <div class="detail-error">
            <h2>Không tải được địa điểm</h2>
            <p>${Utils.escapeHtml(error.message)}</p>
          </div>`;
      }
      Utils.toast(error.message, 'error');
    }
  }

  async function toggleFavorite(id) {
    if (!Auth.isLoggedIn()) {
      Utils.openModal('authModal');
      Utils.toast('Vui lòng đăng nhập để lưu quán yêu thích.', 'info');
      return;
    }
    try {
      const res = await API.post(`/api/Places/${id}/favorite`);
      Utils.toast(res.message || 'Đã cập nhật danh sách yêu thích.', 'success');
      document.dispatchEvent(new CustomEvent('favorites:changed'));
      await openDetail(id);
    } catch (error) {
      Utils.toast(error.message, 'error');
    }
  }

  function resetFilters() {
    const search = Utils.$('#searchInput');
    if (search) search.value = '';
    ['#filterArea', '#filterCategory', '#filterPrice', '#filterRating', '#sortSelect'].forEach((selector) => {
      const field = Utils.$(selector);
      if (field) field.value = '';
    });
    load(1);
  }

  return {
    get state() { return state; },
    get currentId() { return state.currentId; },
    loadMeta,
    load,
    renderCards,
    openDetail,
    toggleFavorite,
    resetFilters,
    iconFor,
  };
})();
