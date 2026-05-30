import { useAuth } from "@/context/AuthContext";
import { AccessTier, tierMeets } from "./tiers";
import { Feature, FEATURE_REQUIRED_TIER } from "./features";

/**
 * The current user's {@link AccessTier}, derived from auth (and, in the future,
 * subscription) state.
 *
 * This is the ONE place that maps app state → tier. Everything else asks
 * {@link useCanAccess} / `requireFeature` instead of inspecting auth directly,
 * so when a new tier source appears (paid subscriptions) it gets wired in here
 * and no call site changes.
 */
export function useAccessTier(): AccessTier {
  const { loading, isAnonymous } = useAuth();

  // Until anonymous bootstrap resolves, treat as guest — never grant access
  // optimistically.
  if (loading) return AccessTier.Guest;

  // Anonymous session → guest. A real account → member.
  if (isAnonymous) return AccessTier.Guest;

  // ── Premium seam (subscriptions not shipped yet) ───────────────────────
  // When paid tiers arrive, read a subscription state here and return
  // `AccessTier.Premium` for active subscribers, e.g.:
  //
  //   if (subscription.isActive) return AccessTier.Premium;
  //
  // Nothing else in the access layer needs to change.

  return AccessTier.Member;
}

/**
 * Whether the current user may use {@link feature}. Use this to drive gated UI
 * (e.g. show/hide a lock badge). Enforce taps with `requireFeature(...)`.
 */
export function useCanAccess(feature: Feature): boolean {
  const tier = useAccessTier();
  return tierMeets(tier, FEATURE_REQUIRED_TIER[feature]);
}
