/**
 * Khởi tạo ứng dụng và nối các sự kiện UI.
 */
(() => {
  let currentView = 'places';

  const VIEW_NAMES = ['places', 'favorites', 'my-reviews', 'admin'];

  /* ----------------------------- Navigation ----------------------------- */

  function updateNavVisibility() {
    Utils.$$('.auth-only').forEach((el) => { el.hidden = !Auth.isLoggedIn(); });
    Utils.$$('.admin-only').forEach((el) => { el.hidden = !Auth.isAdmin(); });
  }

  function setAuthTab(tab) {
    Utils.$$('[data-auth-tab]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.authTab === tab);
    });
    Utils.$$('[data-auth-form]').forEach((form) => {
      form.classList.toggle('hidden', form.dataset.authForm !== tab);
    });
    const title = Utils.$('#authTitle');
    if (title) title.textContent = tab === 'register' ? 'Tạo tài khoản mới' : 'Chào mừng trở lại';
  }

  function switchView(name) {
    if (!VIEW_NAMES.includes(name)) return;

    if ((name === 'favorites' || name === 'my-reviews') && !Auth.isLoggedIn()) {
      setAuthTab('login');
      Utils.openModal('authModal');
      Utils.toast('Vui lòng đăng nhập để tiếp tục.', 'info');
      return;
    }

    if (name === 'admin' && !Auth.isAdmin()) {
      Utils.toast('Bạn không có quyền truy cập trang quản trị.', 'error');
      return;
    }

    currentView = name;
    Utils.$$('.view').forEach((view) => {
      view.classList.toggle('is-active', view.id === `view-${name}`);
    });
    Utils.$$('.nav-link').forEach((link) => {
      link.classList.toggle('is-active', link.dataset.view === name);
    });

    if (name === 'favorites') loadFavorites();
    if (name === 'my-reviews') Reviews.loadMine();
    if (name === 'admin') Admin.load();

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ----------------------------- Favorites ----------------------------- */

  async function loadFavorites() {
    const grid = Utils.$('#favoritesGrid');
    const empty = Utils.$('#favoritesEmpty');
    if (!grid) return;

    grid.innerHTML = Utils.skeletonCards(3);
    Utils.hideEmpty(empty);

    try {
      const res = await API.get('/api/Favorites');
      Places.renderCards(res.data || [], grid, empty);
      Utils.setApiStatus(true);
    } catch (error) {
      grid.innerHTML = '';
      Utils.showEmpty(empty, `
        <span class="empty-icon">⚠️</span>
        <h3>Không tải được danh sách yêu thích</h3>
        <p>${Utils.escapeHtml(error.message)}</p>
      `);
      Utils.toast(error.message, 'error');
    }
  }

  /* ----------------------------- Auth forms ----------------------------- */

  async function handleAuth(form) {
    const type = form.dataset.authForm;
    const data = new FormData(form);
    const button = form.querySelector('button[type="submit"]');
    Utils.setBusy(button, true, type === 'login' ? 'Đang đăng nhập...' : 'Đang tạo...');

    try {
      if (type === 'login') {
        await Auth.login(String(data.get('email') || '').trim(), String(data.get('password') || ''));
        Utils.toast('Đăng nhập thành công.', 'success');
      } else {
        await Auth.register(
          String(data.get('displayName') || '').trim(),
          String(data.get('email') || '').trim(),
          String(data.get('password') || ''),
        );
        Utils.toast('Tạo tài khoản thành công. Bạn đã được đăng nhập.', 'success');
      }
      form.reset();
      Utils.closeModal('authModal');
    } catch (error) {
      Utils.toast(error.message, 'error', 5000);
    } finally {
      Utils.setBusy(button, false);
    }
  }

  /* ----------------------------- Review forms ----------------------------- */

  async function handleReviewSubmit(form) {
    const placeId = Number(form.dataset.placeId);
    const button = form.querySelector('button[type="submit"]');
    Utils.setBusy(button, true, 'Đang gửi...');

    try {
      const res = await Reviews.submit(form, placeId);
      Utils.toast(res.message || 'Đã đăng đánh giá.', 'success');
      form.reset();
      await Places.openDetail(placeId);
      if (currentView === 'my-reviews') Reviews.loadMine();
    } catch (error) {
      Utils.toast(error.message, 'error', 5000);
    } finally {
      Utils.setBusy(button, false);
    }
  }

  async function handleReportSubmit(form) {
    const button = form.querySelector('button[type="submit"]');
    Utils.setBusy(button, true, 'Đang gửi...');
    try {
      const res = await Reviews.submitReport(form);
      Utils.toast(res.message || 'Đã gửi báo cáo.', 'success');
      form.reset();
      Utils.closeModal('reportModal');
    } catch (error) {
      Utils.toast(error.message, 'error', 5000);
    } finally {
      Utils.setBusy(button, false);
    }
  }

  /* ----------------------------- Admin forms ----------------------------- */

  async function handleCreatePlace(form) {
    const button = form.querySelector('button[type="submit"]');
    Utils.setBusy(button, true, 'Đang tạo...');
    try {
      const res = await Admin.createPlace(form);
      Utils.toast(res.message || 'Tạo địa điểm thành công.', 'success');
      form.reset();
      form.hidden = true;
      const toggle = Utils.$('#toggleCreatePlace');
      if (toggle) toggle.textContent = '+ Thêm địa điểm';
      await Admin.load();
      if (currentView === 'places') Places.load(1);
    } catch (error) {
      Utils.toast(error.message, 'error', 5000);
    } finally {
      Utils.setBusy(button, false);
    }
  }

  /* ----------------------------- Event wiring ----------------------------- */

  function bindStaticEvents() {
    const baseLabel = Utils.$('#apiBaseLabel');
    if (baseLabel) baseLabel.textContent = API.base;

    Utils.$('#searchForm')?.addEventListener('submit', (event) => {
      event.preventDefault();
      Places.load(1);
    });

    const debouncedSearch = Utils.debounce(() => Places.load(1), 400);
    Utils.$('#searchInput')?.addEventListener('input', debouncedSearch);

    Utils.$('#filterForm')?.addEventListener('submit', (event) => {
      event.preventDefault();
      Places.load(1);
    });

    Utils.$('#filterForm')?.addEventListener('change', () => Places.load(1));
  }

  function bindDelegatedEvents() {
    document.addEventListener('click', async (event) => {
      const target = event.target;

      const closeButton = target.closest('[data-close]');
      if (closeButton) {
        Utils.closeModal(closeButton.closest('.modal'));
        return;
      }
      if (target.classList.contains('modal')) {
        Utils.closeModal(target);
        return;
      }

      const nav = target.closest('[data-view]');
      if (nav) {
        event.preventDefault();
        switchView(nav.dataset.view);
        return;
      }

      const openAuth = target.closest('[data-open-auth]');
      if (openAuth) {
        setAuthTab(openAuth.dataset.openAuth || 'login');
        Utils.openModal('authModal');
        return;
      }

      const authTab = target.closest('[data-auth-tab]');
      if (authTab) {
        setAuthTab(authTab.dataset.authTab);
        return;
      }

      const demo = target.closest('[data-demo]');
      if (demo) {
        const isAdmin = demo.dataset.demo === 'admin';
        const form = Utils.$('[data-auth-form="login"]');
        if (form) {
          form.elements.email.value = isAdmin ? 'admin@langdaihoc.vn' : 'sinhvien@uit.edu.vn';
          form.elements.password.value = isAdmin ? 'Admin@123' : 'Student@123';
        }
        Utils.toast(`Đã điền tài khoản ${isAdmin ? 'Admin' : 'sinh viên'}. Nhấn “Đăng nhập” để tiếp tục.`, 'info');
        return;
      }

      if (target.closest('[data-action="logout"]')) {
        Auth.logout();
        Utils.toast('Đã đăng xuất.', 'success');
        switchView('places');
        return;
      }

      const opener = target.closest('[data-open-place]');
      if (opener) {
        event.preventDefault();
        Places.openDetail(Number(opener.dataset.openPlace));
        return;
      }

      const favoriteButton = target.closest('[data-action="favorite"]');
      if (favoriteButton) {
        event.preventDefault();
        await Places.toggleFavorite(Number(favoriteButton.dataset.id));
        return;
      }

      const deleteButton = target.closest('[data-action="delete-review"]');
      if (deleteButton) {
        event.preventDefault();
        if (!window.confirm('Bạn chắc chắn muốn xóa đánh giá này?')) return;
        try {
          await Reviews.remove(Number(deleteButton.dataset.id));
          Utils.toast('Đã xóa đánh giá.', 'success');
          if (Places.currentId) await Places.openDetail(Places.currentId);
          if (currentView === 'my-reviews') Reviews.loadMine();
        } catch (error) {
          Utils.toast(error.message, 'error');
        }
        return;
      }

      const reportButton = target.closest('[data-action="report-review"]');
      if (reportButton) {
        event.preventDefault();
        Reviews.openReport(Number(reportButton.dataset.id));
        return;
      }

      const openPlaceButton = target.closest('[data-action="open-place"]');
      if (openPlaceButton) {
        event.preventDefault();
        Places.openDetail(Number(openPlaceButton.dataset.id));
        return;
      }

      const resolveButton = target.closest('[data-action="resolve-report"]');
      if (resolveButton) {
        event.preventDefault();
        try {
          const res = await Admin.resolveReport(Number(resolveButton.dataset.id));
          Utils.toast(res.message || 'Đã xử lý báo cáo.', 'success');
          await Admin.load();
          if (currentView === 'places') Places.load(Places.state.page);
        } catch (error) {
          Utils.toast(error.message, 'error');
        }
        return;
      }

      const banButton = target.closest('[data-action="toggle-ban"]');
      if (banButton) {
        event.preventDefault();
        if (!window.confirm(`Đổi trạng thái khóa cho tài khoản “${banButton.dataset.name}”?`)) return;
        try {
          const res = await Admin.toggleBan(Number(banButton.dataset.id));
          Utils.toast(res.message || 'Đã cập nhật tài khoản.', 'success');
          await Admin.load();
        } catch (error) {
          Utils.toast(error.message, 'error');
        }
        return;
      }

      const hideButton = target.closest('[data-action="hide-place"]');
      if (hideButton) {
        event.preventDefault();
        if (!window.confirm(`Ẩn địa điểm “${hideButton.dataset.name}”?`)) return;
        try {
          const res = await Admin.hidePlace(Number(hideButton.dataset.id));
          Utils.toast(res.message || 'Đã ẩn địa điểm.', 'success');
          await Admin.load();
          if (currentView === 'places') Places.load(1);
        } catch (error) {
          Utils.toast(error.message, 'error');
        }
        return;
      }

      if (target.closest('#adminReload')) {
        Admin.load();
        return;
      }

      if (target.closest('#toggleCreatePlace')) {
        const form = Utils.$('#createPlaceForm');
        const toggle = Utils.$('#toggleCreatePlace');
        if (!form) return;
        form.hidden = !form.hidden;
        if (toggle) toggle.textContent = form.hidden ? '+ Thêm địa điểm' : '− Đóng form';
        return;
      }

      if (target.closest('#cancelCreatePlace')) {
        const form = Utils.$('#createPlaceForm');
        const toggle = Utils.$('#toggleCreatePlace');
        if (form) { form.reset(); form.hidden = true; }
        if (toggle) toggle.textContent = '+ Thêm địa điểm';
        return;
      }

      if (target.closest('#resetFilters') || target.closest('#emptyReset')) {
        Places.resetFilters();
      }
    });

    document.addEventListener('submit', async (event) => {
      const form = event.target;

      if (form.matches('[data-auth-form]')) {
        event.preventDefault();
        await handleAuth(form);
      } else if (form.matches('[data-review-form]')) {
        event.preventDefault();
        await handleReviewSubmit(form);
      } else if (form.id === 'reportForm') {
        event.preventDefault();
        await handleReportSubmit(form);
      } else if (form.id === 'createPlaceForm') {
        event.preventDefault();
        await handleCreatePlace(form);
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        Utils.closeAllModals();
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        const card = event.target.closest('[data-open-place]');
        if (card && card.tagName !== 'BUTTON') {
          event.preventDefault();
          Places.openDetail(Number(card.dataset.openPlace));
        }
      }
    });

    document.addEventListener('auth:changed', () => {
      updateNavVisibility();

      if (!Auth.isLoggedIn() && ['favorites', 'my-reviews', 'admin'].includes(currentView)) {
        switchView('places');
      } else if (currentView === 'favorites') {
        loadFavorites();
      } else if (currentView === 'my-reviews') {
        Reviews.loadMine();
      } else if (currentView === 'admin' && Auth.isAdmin()) {
        Admin.load();
      }

      const placeModal = Utils.$('#placeModal');
      if (Places.currentId && placeModal?.classList.contains('is-open')) {
        Places.openDetail(Places.currentId);
      }
    });

    document.addEventListener('favorites:changed', () => {
      if (currentView === 'favorites') loadFavorites();
    });
  }

  /* ----------------------------- Bootstrap ----------------------------- */

  async function bootstrap() {
    bindStaticEvents();
    bindDelegatedEvents();
    updateNavVisibility();

    await Auth.init();

    try {
      await Places.loadMeta();
      Utils.setApiStatus(true);
      await Places.load(1);
    } catch (error) {
      // Không có error.status nghĩa là lỗi kết nối; lỗi HTTP (4xx/5xx) thì
      // API vẫn đang chạy, chỉ là yêu cầu thất bại.
      Utils.setApiStatus(Boolean(error.status));
      Utils.toast(error.message, 'error', 6000);
      Places.load(1);
    }
  }

  document.addEventListener('DOMContentLoaded', bootstrap);
})();
