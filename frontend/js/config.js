/**
 * Cấu hình frontend.
 *
 * API_BASE_URL: để trống để tự dò backend (Docker :5000 trước, sau đó dotnet :5114).
 * Nếu muốn cố định địa chỉ, đặt ví dụ: 'http://localhost:5000'.
 * API_PORTS: danh sách cổng backend sẽ thử khi tự dò.
 */
const CONFIG = {
  API_BASE_URL: '',
  API_PORTS: ['5000', '5114'],
  TOKEN_KEY: 'foodreview.token',
  USER_KEY: 'foodreview.user',
};
