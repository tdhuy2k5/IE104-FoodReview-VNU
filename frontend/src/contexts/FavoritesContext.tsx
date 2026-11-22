import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { Place } from "../types/api";
import { api } from "../services/api";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";
import { errorMessage } from "../utils/format";
interface Favorites {
  places: Place[];
  loading: boolean;
  error: string;
  pending: Set<number>;
  toggle: (place: Place) => Promise<void>;
  retry: () => void;
}
const Context = createContext<Favorites | null>(null);
export function useFavorites() {
  const value = useContext(Context);
  if (!value) throw Error("FavoritesProvider missing");
  return value;
}
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const notify = useToast();
  const [places, setPlaces] = useState<Place[]>([]),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const [pending, setPending] = useState(new Set<number>()),
    [revision, setRevision] = useState(0);
  const pendingRef = useRef(new Set<number>()),
    userId = useRef(user?.id);
  userId.current = user?.id;
  useEffect(() => {
    const controller = new AbortController();
    setPlaces([]);
    setError("");
    pendingRef.current.clear();
    setPending(new Set());
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .favorites(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setPlaces(data);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(errorMessage(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [user?.id, revision]);
  const toggle = useCallback(
    async (place: Place) => {
      if (!user?.id || pendingRef.current.has(place.id) || loading || error)
        return;
      const owner = user.id;
      pendingRef.current.add(place.id);
      setPending(new Set(pendingRef.current));
      try {
        const result = await api.toggleFavorite(place.id);
        if (userId.current !== owner) return;
        setPlaces((list) =>
          result.isFavorite
            ? [...list.filter((p) => p.id !== place.id), place]
            : list.filter((p) => p.id !== place.id),
        );
        notify(
          result.isFavorite
            ? "Đã lưu quán vào danh sách của bạn."
            : "Đã bỏ lưu quán.",
        );
      } catch (err) {
        if (userId.current === owner) notify(errorMessage(err));
      } finally {
        if (userId.current === owner) {
          pendingRef.current.delete(place.id);
          setPending(new Set(pendingRef.current));
        }
      }
    },
    [user?.id, loading, error, notify],
  );
  return (
    <Context.Provider
      value={{
        places,
        loading,
        error,
        pending,
        toggle,
        retry: () => setRevision((n) => n + 1),
      }}
    >
      {children}
    </Context.Provider>
  );
}
