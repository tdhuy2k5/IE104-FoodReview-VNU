import { useCallback, useEffect, useReducer, useState } from "react";
export function useResource<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [revision, retry] = useReducer((n) => n + 1, 0);
  const [state, setState] = useState<{
    data?: T;
    error?: unknown;
    loading: boolean;
  }>({ loading: true });
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true });
    load(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ data, loading: false });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setState({ error, loading: false });
      });
    return () => controller.abort();
  }, [load, revision]);
  return { ...state, retry: useCallback(() => retry(), []) };
}
