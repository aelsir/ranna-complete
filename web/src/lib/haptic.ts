/**
 * Haptic feedback wrapper for the web app.
 *
 * Backed by `navigator.vibrate()` — works on Android Chrome / Firefox and is
 * a no-op on iOS Safari (iOS doesn't expose haptics to web pages outside
 * `<a>` tap-highlights). The no-op fallback is intentional: we want one call
 * site that just works, not feature-detection plumbing in every component.
 *
 * Pick a level by user *intent*, mirroring the Flutter `Haptics` helper:
 *   - selection : low-friction confirms (play/pause, skip, tab change, filter chip)
 *   - light     : adding/committing something (favorite ON, queue insert)
 *   - medium    : finalizing a gesture (swipe-to-dismiss commit)
 *
 * Why short single-pulse durations instead of patterns: the goal is "did
 * the tap register" feedback, not a dial-tone. Anything > ~25ms starts
 * feeling like a notification buzz, which is the wrong affordance.
 */

const canVibrate = (): boolean => {
  if (typeof navigator === "undefined") return false;
  return typeof navigator.vibrate === "function";
};

const buzz = (ms: number) => {
  if (!canVibrate()) return;
  try {
    navigator.vibrate(ms);
  } catch {
    // Some browsers throw if called outside a user gesture — swallow.
  }
};

export const haptic = {
  selection: () => buzz(8),
  light: () => buzz(12),
  medium: () => buzz(18),
  heavy: () => buzz(28),
};
