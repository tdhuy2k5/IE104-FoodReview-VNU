import { useEffect, useRef } from "react";
import type { PointerEvent } from "react";

// One animation frame at most; measure on entry, never on every pointer move.
export function useTilt(max = 4) {
  const frame = useRef(0);
  const rect = useRef<DOMRect | null>(null);
  const active = useRef<HTMLElement | null>(null);
  const eligible = () =>
    matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches;
  const reset = () => {
    cancelAnimationFrame(frame.current);
    active.current?.style.removeProperty("--tilt-x");
    active.current?.style.removeProperty("--tilt-y");
    active.current?.removeAttribute("data-tilting");
    active.current = null;
    rect.current = null;
  };
  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    preference.addEventListener("change", reset);
    return () => {
      preference.removeEventListener("change", reset);
      reset();
    };
  }, []);
  return {
    onPointerEnter: (event: PointerEvent<HTMLElement>) => {
      if (!eligible()) return;
      rect.current = event.currentTarget.getBoundingClientRect();
      active.current = event.currentTarget;
      active.current.dataset.tilting = "true";
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      if (!active.current || !rect.current || !eligible()) return;
      const x = event.clientX,
        y = event.clientY,
        bounds = rect.current,
        element = active.current;
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        const clamp = (n: number) => Math.max(-max, Math.min(max, n));
        element.style.setProperty(
          "--tilt-x",
          `${clamp(-((y - bounds.top) / bounds.height - 0.5) * max * 2)}deg`,
        );
        element.style.setProperty(
          "--tilt-y",
          `${clamp(((x - bounds.left) / bounds.width - 0.5) * max * 2)}deg`,
        );
      });
    },
    onPointerLeave: reset,
    onPointerCancel: reset,
  };
}
