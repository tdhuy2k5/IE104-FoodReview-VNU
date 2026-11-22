import { Component } from "react";
import type { ReactNode } from "react";
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="container page-space">
        <div className="state-card" role="alert">
          <h1>Trang cần được tải lại</h1>
          <p>Có lỗi hiển thị. Bạn có thể tải lại để tiếp tục.</p>
          <button
            className="button primary"
            onClick={() => window.location.reload()}
          >
            Tải lại trang
          </button>
        </div>
      </main>
    ) : (
      this.props.children
    );
  }
}
