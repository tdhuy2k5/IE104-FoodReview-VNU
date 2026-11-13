/**
 * Các hàm dùng chung: DOM, format, toast, modal, nhãn enum.
 */
const Utils = (() => {
  const PLACE_STATUS = { 0: 'Bản nháp', 1: 'Đang hiển thị', 2: 'Đã ẩn' };
  const REVIEW_STATUS = { 0: 'Chờ duyệt', 1: 'Đã đăng', 2: 'Đã ẩn' };
  const REPORT_REASON = { 0: 'Spam / quảng cáo', 1: 'Không phù hợp', 2: 'Sai lệch', 3: 'Khác' };
  const REPORT_STATUS = { 0: 'Chờ xử lý', 1: 'Đã xử lý', 2: 'Bỏ qua' };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[char]));
  }

  function money(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return '—';
    return `${number.toLocaleString('vi-VN')}đ`;
  }

  function priceRange(min, max) {
    const low = Number(min) || 0;
    const high = Number(max) || 0;
    if (low === high) return money(low);
    return `${money(low)} – ${money(high)}`;
  }

  function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function formatDateTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  function rating(value) {
    return (Number(value) || 0).toFixed(1);
  }

  function imageUrl(url) {
    if (!url) return '';
    if (/^(https?:|data:|blob:)/i.test(url)) return url;
    const base = (typeof API !== 'undefined' ? API.base : CONFIG.API_BASE_URL).replace(/\/$/, '');
    return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  function initials(name) {
    const parts = String(name || '?').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function label(map, value) {
    return Object.prototype.hasOwnProperty.call(map, value) ? map[value] : String(value ?? '');
  }

  function setApiStatus(online) {
    const el = $('#apiStatus');
    if (!el) return;
    el.classList.toggle('is-online', !!online);
    el.classList.toggle('is-offline', !online);
    el.classList.remove('is-pending');
    const text = $('.api-status-text', el);
    if (text) text.textContent = online ? 'API hoạt động' : 'Mất kết nối API';
  }

  function toast(message, type = 'info', timeout = 3800) {
    const stack = $('#toastStack');
    if (!stack) return;
    const icons = { success: '✓', error: '!', info: 'i' };
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `
      <span class="toast-icon" aria-hidden="true">${icons[type] || icons.info}</span>
      <span>${escapeHtml(message)}</span>`;
    stack.appendChild(el);
    requestAnimationFrame(() => el.classList.add('is-visible'));
    setTimeout(() => {
      el.classList.remove('is-visible');
      setTimeout(() => el.remove(), 250);
    }, timeout);
  }

  function setBusy(button, busy, text = 'Đang xử lý...') {
    if (!button) return;
    if (busy) {
      button.dataset.originalText = button.textContent;
      button.disabled = true;
      button.textContent = text;
    } else {
      button.disabled = false;
      if (button.dataset.originalText) {
        button.textContent = button.dataset.originalText;
        delete button.dataset.originalText;
      }
    }
  }

  function openModal(target) {
    const modal = typeof target === 'string' ? document.getElementById(target) : target;
    if (!modal) return;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    const focusable = modal.querySelector('input, select, textarea, button:not(.modal-close)');
    if (focusable) setTimeout(() => focusable.focus(), 60);
  }

  function closeModal(target) {
    const modal = typeof target === 'string' ? document.getElementById(target) : target;
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    if (!document.querySelector('.modal.is-open')) {
      document.body.classList.remove('modal-open');
    }
  }

  function closeAllModals() {
    $$('.modal.is-open').forEach((modal) => closeModal(modal));
  }

  function debounce(fn, delay = 350) {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  function skeletonCards(count = 6) {
    return Array.from({ length: count }, () => `
      <div class="place-card skeleton" aria-hidden="true">
        <div class="skeleton-cover"></div>
        <div class="skeleton-body">
          <div class="skeleton-line w-60"></div>
          <div class="skeleton-line w-80"></div>
          <div class="skeleton-line w-40"></div>
        </div>
      </div>`).join('');
  }

  function emptyTable(message) {
    return `<p class="admin-empty">${escapeHtml(message)}</p>`;
  }

  /**
   * Hiện khối empty-state. Nội dung gốc được ghi nhớ để có thể khôi phục
   * sau khi tạm thời hiển thị thông báo lỗi.
   */
  function showEmpty(element, html) {
    if (!element) return;
    if (element.dataset.defaultHtml === undefined) {
      element.dataset.defaultHtml = element.innerHTML;
    }
    element.innerHTML = html || element.dataset.defaultHtml;
    element.hidden = false;
  }

  function hideEmpty(element) {
    if (element) element.hidden = true;
  }

  return {
    PLACE_STATUS,
    REVIEW_STATUS,
    REPORT_REASON,
    REPORT_STATUS,
    $,
    $$,
    escapeHtml,
    money,
    priceRange,
    formatDate,
    formatDateTime,
    rating,
    imageUrl,
    initials,
    label,
    setApiStatus,
    toast,
    setBusy,
    openModal,
    closeModal,
    closeAllModals,
    debounce,
    skeletonCards,
    emptyTable,
    showEmpty,
    hideEmpty,
  };
})();
