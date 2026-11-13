/**
 * Lớp gọi API dùng chung.
 * Tự dò backend (Docker :5000 hoặc dotnet :5114), tự gắn JWT,
 * parse ApiResponse<T> và ném lỗi có message từ backend.
 */
const API = (() => {
  const explicitBase = (CONFIG.API_BASE_URL || '').replace(/\/$/, '');
  const PROBE_TIMEOUT_MS = 4500;
  let activeBase = explicitBase || null;
  let resolving = null;

  function defaultBase() {
    return explicitBase || buildCandidates()[0];
  }

  function buildCandidates() {
    if (explicitBase) return [explicitBase];

    const host = window.location.hostname || 'localhost';
    const scheme = window.location.protocol === 'https:' ? 'https:' : 'http:';
    const hosts = host === 'localhost' ? ['localhost'] : [host, 'localhost'];

    const candidates = [];
    hosts.forEach((candidateHost) => {
      CONFIG.API_PORTS.forEach((port) => {
        candidates.push(`${scheme}//${candidateHost}:${port}`);
      });
    });
    return [...new Set(candidates)];
  }

  async function probe(base) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    try {
      const response = await fetch(`${base}/api/Areas`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      return response.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  function resolveBase() {
    if (activeBase) return Promise.resolve(activeBase);
    if (resolving) return resolving;

    const task = (async () => {
      const candidates = buildCandidates();
      for (const candidate of candidates) {
        if (await probe(candidate)) {
          activeBase = candidate;
          return activeBase;
        }
      }

      // Không lưu cổng lỗi: lần gọi sau sẽ dò lại, nhờ vậy frontend tự
      // phục hồi khi backend được khởi động sau khi trang đã mở.
      throw new Error(
        `Không kết nối được tới backend (đã thử ${candidates.join(', ')}). ` +
        'Hãy chắc chắn Docker container hoặc dotnet run đang chạy.',
      );
    })();

    resolving = task;
    task.then(
      () => { resolving = null; },
      () => { resolving = null; },
    );
    return task;
  }

  function getToken() {
    return localStorage.getItem(CONFIG.TOKEN_KEY);
  }

  async function request(path, options = {}) {
    const { method = 'GET', body, auth = true } = options;
    const base = await resolveBase();
    const headers = { Accept: 'application/json' };

    const token = getToken();
    if (auth && token) headers.Authorization = `Bearer ${token}`;

    let payload;
    if (body !== undefined) {
      if (body instanceof FormData) {
        payload = body; // Trình duyệt tự set Content-Type + boundary
      } else {
        headers['Content-Type'] = 'application/json';
        payload = JSON.stringify(body);
      }
    }

    let response;
    try {
      response = await fetch(`${base}${path}`, { method, headers, body: payload });
    } catch (error) {
      // Backend có thể vừa tắt/đổi cổng: xóa cache để lần sau dò lại.
      if (activeBase === base) activeBase = null;
      throw new Error(`Không kết nối được tới API tại ${base}. Hãy chắc chắn backend đang chạy.`);
    }

    const text = await response.text();
    let data = null;
    if (text) {
      try { data = JSON.parse(text); } catch { data = text; }
    }

    if (!response.ok) {
      const validationErrors = data && typeof data === 'object' && data.errors
        ? Object.values(data.errors).flat().filter(Boolean).join(' ')
        : '';
      const message =
        validationErrors ||
        (data && typeof data === 'object' && (data.message || data.title)) ||
        (typeof data === 'string' && data) ||
        `Lỗi HTTP ${response.status}`;
      const error = new Error(message);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  const get = (path, options = {}) => request(path, { ...options, method: 'GET' });
  const post = (path, body, options = {}) => request(path, { ...options, method: 'POST', body });
  const put = (path, body, options = {}) => request(path, { ...options, method: 'PUT', body });
  const del = (path, options = {}) => request(path, { ...options, method: 'DELETE' });

  async function upload(file, folder = 'images') {
    const formData = new FormData();
    formData.append('file', file);
    return request(`/api/Upload?folder=${encodeURIComponent(folder)}`, {
      method: 'POST',
      body: formData,
    });
  }

  async function ping() {
    return request('/api/Areas', { auth: false });
  }

  return {
    get base() { return activeBase || defaultBase(); },
    getToken,
    request,
    get,
    post,
    put,
    del,
    upload,
    ping,
  };
})();
