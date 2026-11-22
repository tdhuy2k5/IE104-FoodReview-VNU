import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { api } from "../services/api";
import { setAccessToken } from "../services/http";
import type { AuthResponse, User } from "../types/api";
import { useToast } from "./ToastContext";
interface Auth {
  user: User | null;
  accept: (result: AuthResponse) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}
const Context = createContext<Auth | null>(null);
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw Error("AuthProvider missing");
  return value;
}
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [expiresAt, setExpiresAt] = useState<number>();
  const session = useRef(0);
  const notify = useToast();
  const logout = useCallback(() => {
    session.current++;
    setAccessToken(null);
    setUser(null);
    setExpiresAt(undefined);
  }, []);
  const accept = useCallback(
    async (result: AuthResponse) => {
      const generation = ++session.current;
      setAccessToken(result.token);
      try {
        const profile = await api.me();
        if (generation !== session.current)
          throw Error("Phiên đăng nhập đã thay đổi. Vui lòng thử lại.");
        const payload = JSON.parse(
          atob(
            result.token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"),
          ),
        );
        if (typeof payload.exp !== "number" || payload.exp * 1000 <= Date.now())
          throw Error("Phiên đăng nhập đã hết hạn.");
        setUser(profile);
        setExpiresAt(payload.exp * 1000);
      } catch (error) {
        if (generation === session.current) logout();
        throw error;
      }
    },
    [logout],
  );
  const refresh = useCallback(async () => {
    const generation = session.current;
    const profile = await api.me();
    if (generation === session.current) setUser(profile);
  }, []);
  useEffect(() => {
    const expire = () => {
      logout();
      notify("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    };
    window.addEventListener("foodreview:unauthorized", expire);
    const timer = expiresAt
      ? setTimeout(expire, Math.min(expiresAt - Date.now(), 2147483647))
      : undefined;
    return () => {
      window.removeEventListener("foodreview:unauthorized", expire);
      clearTimeout(timer);
    };
  }, [expiresAt, logout, notify]);
  return (
    <Context.Provider value={{ user, accept, logout, refresh }}>
      {children}
    </Context.Provider>
  );
}
