/**
 * Bảng điều khiển Admin: báo cáo, người dùng, địa điểm.
 */
const Admin = (() => {
  function reportStatusPill(status) {
    const classes = { 0: 'status-warn', 1: 'status-ok', 2: 'status-muted' };
    return `<span class="status-pill ${classes[status] || 'status-muted'}">${Utils.escapeHtml(Utils.label(Utils.REPORT_STATUS, status))}</span>`;
  }

  function placeStatusPill(status) {
    const classes = { 0: 'status-warn', 1: 'status-ok', 2: 'status-danger' };
    return `<span class="status-pill ${classes[status] || 'status-muted'}">${Utils.escapeHtml(Utils.label(Utils.PLACE_STATUS, status))}</span>`;
  }

  function renderReports(items) {
    const container = Utils.$('#adminReports');
    if (!container) return;
    if (!items.length) {
      container.innerHTML = Utils.emptyTable('Chưa có báo cáo vi phạm nào.');
      return;
    }

    const rows = items.map((report) => {
      const pending = report.status === 0;
      const actions = pending
        ? `<div class="inline-actions">
             <select class="input-sm" data-report-status="${report.id}">
               <option value="1">Đã xử lý</option>
               <option value="2">Bỏ qua</option>
             </select>
             <label class="check">
               <input type="checkbox" data-hide-review="${report.id}" /> Ẩn review
             </label>
             <button class="btn btn-primary btn-sm" type="button" data-action="resolve-report" data-id="${report.id}">Áp dụng</button>
           </div>`
        : `<span class="muted small">${Utils.escapeHtml(report.handledByName || '—')}${report.handledAt ? ` · ${Utils.formatDate(report.handledAt)}` : ''}</span>`;

      return `
        <tr>
          <td>#${report.id}</td>
          <td>
            <span class="cell-title">${Utils.escapeHtml(report.reviewAuthorName)}</span>
            <span class="cell-sub" title="${Utils.escapeHtml(report.reviewContent)}">${Utils.escapeHtml(report.reviewContent)}</span>
          </td>
          <td>
            <span class="cell-title">${Utils.escapeHtml(report.reporterName)}</span>
            <span class="cell-sub">${Utils.escapeHtml(Utils.label(Utils.REPORT_REASON, report.reason))}</span>
          </td>
          <td>${reportStatusPill(report.status)}</td>
          <td>${actions}</td>
        </tr>`;
    }).join('');

    container.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr><th>ID</th><th>Đánh giá bị báo cáo</th><th>Người báo cáo / lý do</th><th>Trạng thái</th><th>Thao tác</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  function renderUsers(items) {
    const container = Utils.$('#adminUsers');
    if (!container) return;
    if (!items.length) {
      container.innerHTML = Utils.emptyTable('Chưa có người dùng.');
      return;
    }

    const rows = items.map((user) => `
      <tr>
        <td>#${user.id}</td>
        <td>
          <span class="cell-title">${Utils.escapeHtml(user.displayName)}</span>
          <span class="cell-sub">${Utils.escapeHtml(user.email)}</span>
        </td>
        <td>${String(user.role).toLowerCase() === 'admin'
          ? '<span class="status-pill status-warn">Admin</span>'
          : '<span class="status-pill status-muted">User</span>'}</td>
        <td>${user.totalReviews}</td>
        <td>${user.totalFavorites}</td>
        <td>
          <button class="link-btn danger" type="button" data-action="toggle-ban"
            data-id="${user.id}" data-name="${Utils.escapeHtml(user.displayName)}">Khóa / Mở khóa</button>
        </td>
      </tr>`).join('');

    container.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr><th>ID</th><th>Tài khoản</th><th>Vai trò</th><th>Đánh giá</th><th>Yêu thích</th><th>Thao tác</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  function renderPlaces(items) {
    const container = Utils.$('#adminPlaces');
    if (!container) return;
    if (!items.length) {
      container.innerHTML = Utils.emptyTable('Chưa có địa điểm.');
      return;
    }

    const rows = items.map((place) => `
      <tr>
        <td>#${place.id}</td>
        <td>
          <span class="cell-title">${Utils.escapeHtml(place.name)}</span>
          <span class="cell-sub" title="${Utils.escapeHtml(place.address)}">${Utils.escapeHtml(place.address)}</span>
        </td>
        <td>${Utils.escapeHtml(place.areaName)}</td>
        <td>${Utils.escapeHtml(place.categoryName)}</td>
        <td>${Utils.escapeHtml(Utils.priceRange(place.priceMin, place.priceMax))}</td>
        <td><span class="rating-pill">★ ${Utils.rating(place.averageRating)}</span></td>
        <td>${placeStatusPill(place.status)}</td>
        <td>
          <div class="inline-actions">
            <button class="link-btn" type="button" data-action="open-place" data-id="${place.id}">Xem</button>
            ${place.status !== 2
              ? `<button class="link-btn danger" type="button" data-action="hide-place"
                   data-id="${place.id}" data-name="${Utils.escapeHtml(place.name)}">Ẩn</button>`
              : '<span class="muted small">Đã ẩn</span>'}
          </div>
        </td>
      </tr>`).join('');

    container.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr><th>ID</th><th>Địa điểm</th><th>Khu vực</th><th>Danh mục</th><th>Giá</th><th>Đánh giá</th><th>Trạng thái</th><th>Thao tác</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  async function load() {
    if (!Auth.isAdmin()) return;

    const loading = '<div class="detail-loading"><div class="spinner" aria-hidden="true"></div></div>';
    ['#adminReports', '#adminUsers', '#adminPlaces'].forEach((selector) => {
      const el = Utils.$(selector);
      if (el) el.innerHTML = loading;
    });

    try {
      const [reports, users, places] = await Promise.all([
        API.get('/api/Admin/reports'),
        API.get('/api/Admin/users'),
        API.get('/api/Admin/places'),
      ]);
      renderReports(reports.data || []);
      renderUsers(users.data || []);
      renderPlaces(places.data || []);
      Utils.setApiStatus(true);
    } catch (error) {
      ['#adminReports', '#adminUsers', '#adminPlaces'].forEach((selector) => {
        const el = Utils.$(selector);
        if (el) el.innerHTML = Utils.emptyTable(error.message);
      });
      Utils.toast(error.message, 'error');
    }
  }

  async function resolveReport(id) {
    const statusSelect = document.querySelector(`[data-report-status="${id}"]`);
    const hideCheckbox = document.querySelector(`[data-hide-review="${id}"]`);
    const payload = {
      status: Number(statusSelect?.value ?? 1),
      hideReview: !!hideCheckbox?.checked,
    };
    return API.put(`/api/Admin/reports/${id}/resolve`, payload);
  }

  async function toggleBan(userId) {
    return API.put(`/api/Admin/users/${userId}/toggle-ban`);
  }

  async function hidePlace(placeId) {
    return API.del(`/api/Places/${placeId}`);
  }

  async function createPlace(form) {
    const data = new FormData(form);
    const text = (name) => String(data.get(name) || '').trim();
    const num = (name) => Number(data.get(name));

    if (num('priceMax') < num('priceMin')) {
      throw new Error('Giá cao nhất phải lớn hơn hoặc bằng giá thấp nhất.');
    }

    return API.post('/api/Places', {
      name: text('name'),
      description: text('description') || null,
      address: text('address'),
      areaId: num('areaId'),
      categoryId: num('categoryId'),
      priceMin: num('priceMin'),
      priceMax: num('priceMax'),
      openingHours: text('openingHours') || null,
      coverImageUrl: text('coverImageUrl') || null,
      menuItems: [],
    });
  }

  return { load, resolveReport, toggleBan, hidePlace, createPlace };
})();
