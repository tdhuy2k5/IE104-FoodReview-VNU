import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";
const ToastContext = createContext<(message: string) => void>(() => {});
export const useToast = () => useContext(ToastContext);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; id: number }>();
  const notify = useCallback(
    (message: string) => setToast({ message, id: Date.now() }),
    [],
  );
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(undefined), 5500);
    return () => clearTimeout(timer);
  }, [toast]);
  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div
        className="toast-region"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {toast && (
          <div className="toast">
            <span>{toast.message}</span>
            <button
              type="button"
              aria-label="Đóng thông báo"
              onClick={() => setToast(undefined)}
            >
              ×
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
