/**
 * Quản lý đăng nhập / đăng ký / phiên làm việc.
 * Token và thông tin user được lưu trong localStorage.
 */
const Auth = (() => {
  let user = null;

  function getStoredUser() {
    try {
      return JSON.parse(localStorage.getItem(CONFIG.USER_KEY) || 'null');
    } catch {
      return null;
    }
  }

  function persist(authData) {
    user = authData;
    localStorage.setItem(CONFIG.TOKEN_KEY, authData.token);
    localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(authData));
    render();
  }

  function clear() {
    user = null;
    localStorage.removeItem(CONFIG.TOKEN_KEY);
    localStorage.removeItem(CONFIG.USER_KEY);
    render();
  }

  function isLoggedIn() {
    return !!localStorage.getItem(CONFIG.TOKEN_KEY) && !!user;
  }

  function isAdmin() {
    return isLoggedIn() && String(user.role).toLowerCase() === 'admin';
  }

  async function init() {
    user = getStoredUser();
    if (isLoggedIn()) {
      try {
        const res = await API.get('/api/Auth/me');
        user = { ...user, ...(res.data || {}) };
        localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user));
      } catch (error) {
        // Chỉ xóa phiên khi token thực sự hết hạn/không hợp lệ.
        if (error.status === 401 || error.status === 403) clear();
      }
    }
    render();
  }

  async function login(email, password) {
    const res = await API.post('/api/Auth/login', { email, password }, { auth: false });
    persist(res.data);
    return res;
  }

  async function register(displayName, email, password) {
    const res = await API.post('/api/Auth/register', { displayName, email, password }, { auth: false });
    persist(res.data);
    return res;
  }

  function logout() {
    clear();
  }

  function render() {
    const area = Utils.$('#authArea');
    if (!area) return;

    if (isLoggedIn()) {
      const avatar = Utils.imageUrl(user.avatarUrl);
      area.innerHTML = `
        <div class="user-chip">
          <span class="avatar">
            ${Utils.escapeHtml(Utils.initials(user.displayName))}
            ${avatar ? `<img src="${Utils.escapeHtml(avatar)}" alt="" onerror="this.remove()" />` : ''}
          </span>
          <span class="user-meta">
            <strong>${Utils.escapeHtml(user.displayName || 'Người dùng')}</strong>
            <span>${isAdmin() ? 'Quản trị viên' : 'Sinh viên'}</span>
          </span>
          <button class="btn btn-ghost btn-sm" type="button" data-action="logout">Đăng xuất</button>
        </div>`;
    } else {
      area.innerHTML = `
        <button class="btn btn-ghost btn-sm" type="button" data-open-auth="login">Đăng nhập</button>
        <button class="btn btn-primary btn-sm" type="button" data-open-auth="register">Đăng ký</button>`;
    }

    document.body.classList.toggle('logged-in', isLoggedIn());
    document.body.classList.toggle('is-admin', isAdmin());
    document.dispatchEvent(new CustomEvent('auth:changed'));
  }

  return {
    get user() { return user; },
    init,
    login,
    register,
    logout,
    isLoggedIn,
    isAdmin,
    render,
  };
})();
