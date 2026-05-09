import { useEffect, useRef, useState } from "react";

/**
 * Single source of truth for how long count-up animations last across the
 * web app. Tune here, every caller updates. Mirrored on the Flutter side
 * by `_kCountUpDuration` in `home_screen.dart`.
 */
export const COUNT_UP_DURATION_MS = 4000;

/**
 * Animate a numeric value from 0 to `target` over [COUNT_UP_DURATION_MS].
 *
 * Returns the current animated number; render it directly in JSX. The
 * animation runs on `requestAnimationFrame`, so it stays smooth and
 * cheap (no per-tick re-renders beyond what React already does).
 *
 * Behavior:
 *   - When `target` is `null` / `undefined` / `0`, returns `null` —
 *     callers can use this to render a fallback label until real data
 *     arrives, instead of showing a meaningless "0".
 *   - When `target` becomes a positive number (or changes to a new
 *     positive number), the animation restarts from 0 and ticks up.
 *     This makes a page refresh re-trigger the animation naturally,
 *     because remount → state resets → effect fires.
 *
 * Easing: `easeOut` (cubic). Decelerates into the final number, which
 * reads as "landing" on the value rather than slamming into it. Avoid
 * linear — counters that stop abruptly feel mechanical.
 */
export function useCountUp(
  target: number | null | undefined,
): number | null {
  const [value, setValue] = useState<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target == null || target <= 0) {
      setValue(null);
      return;
    }

    const startedAt = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - startedAt) / COUNT_UP_DURATION_MS);
      // easeOutCubic — same shape as the Flutter side's Curves.easeOut.
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(eased * target));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [target]);

  return value;
}
