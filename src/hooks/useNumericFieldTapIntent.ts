import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";

const DEFAULT_THRESHOLD_PX = 8;
const DEFAULT_MAX_DURATION_MS = 450;

/**
 * Opens the numeric keypad only on an intentional tap: short press, minimal movement.
 * Uses window-level pointer listeners (no pointer capture) so vertical scroll can start on the cell.
 */
export function useNumericFieldTapIntent(
  onCommitTap: () => void,
  opts?: { thresholdPx?: number; maxDurationMs?: number },
) {
  const thresholdPx = opts?.thresholdPx ?? DEFAULT_THRESHOLD_PX;
  const maxDurationMs = opts?.maxDurationMs ?? DEFAULT_MAX_DURATION_MS;
  const sessionRef = useRef<{
    x: number;
    y: number;
    t: number;
    active: boolean;
    pointerId: number;
  } | null>(null);
  const onCommitTapRef = useRef(onCommitTap);
  onCommitTapRef.current = onCommitTap;
  const thresholdRef = useRef(thresholdPx);
  const maxDurationRef = useRef(maxDurationMs);
  thresholdRef.current = thresholdPx;
  maxDurationRef.current = maxDurationMs;

  const moveRef = useRef<(e: PointerEvent) => void>(() => {});
  const upRef = useRef<(e: PointerEvent) => void>(() => {});

  const detachWindowListeners = useCallback(() => {
    window.removeEventListener("pointermove", moveRef.current);
    window.removeEventListener("pointerup", upRef.current);
    window.removeEventListener("pointercancel", upRef.current);
  }, []);

  moveRef.current = (e: PointerEvent) => {
    const s = sessionRef.current;
    if (!s || e.pointerId !== s.pointerId) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.hypot(dx, dy) > thresholdRef.current) {
      s.active = false;
    }
  };

  upRef.current = (e: PointerEvent) => {
    const s = sessionRef.current;
    if (!s || e.pointerId !== s.pointerId) return;
    const wasActive = s.active;
    const startedAt = s.t;
    detachWindowListeners();
    sessionRef.current = null;
    if (!wasActive) return;
    if (Date.now() - startedAt > maxDurationRef.current) return;
    e.preventDefault();
    onCommitTapRef.current();
  };

  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        detachWindowListeners();
        sessionRef.current = null;
      }
    };
  }, [detachWindowListeners]);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      if (sessionRef.current) {
        detachWindowListeners();
        sessionRef.current = null;
      }
      sessionRef.current = {
        x: e.clientX,
        y: e.clientY,
        t: Date.now(),
        active: true,
        pointerId: e.pointerId,
      };
      window.addEventListener("pointermove", moveRef.current, { passive: true });
      window.addEventListener("pointerup", upRef.current);
      window.addEventListener("pointercancel", upRef.current);
    },
    [detachWindowListeners],
  );

  return { onPointerDown };
}
