import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { haptic } from "@/lib/haptic";
import { AccessTier, tierMeets } from "./tiers";
import { Feature, FEATURE_REQUIRED_TIER } from "./features";
import { useAccessTier } from "./useAccess";
import { AccessGateScreen } from "./AccessGateScreen";

interface AccessGateContextValue {
  /**
   * Gate an action behind a {@link Feature}'s required tier. Call at the START
   * of any handler for a gated action:
   *
   * ```tsx
   * const requireFeature = useRequireFeature();
   * // ...
   * onClick={() => {
   *   if (!requireFeature(Feature.ViewLyrics)) return;
   *   // ...proceed; user is entitled.
   * }}
   * ```
   *
   * Returns `true` if the user may proceed. Otherwise shows the full-screen
   * access gate (sign-in today, paywall once premium ships) and returns `false`.
   */
  requireFeature: (feature: Feature) => boolean;
  /** Imperatively show the gate for a feature without the entitlement check. */
  showAccessGate: (feature: Feature) => void;
}

const AccessGateContext = createContext<AccessGateContextValue | null>(null);

/**
 * Owns the single full-screen {@link AccessGateScreen} instance and exposes
 * {@link useRequireFeature}. Mount it once near the app root, INSIDE both
 * `AuthProvider` (the tier derives from auth) and the router (the gate CTA
 * navigates). Web mirror of the Flutter `requireFeature` guard +
 * `showAccessGateSheet` (`app/lib/access/access_guard.dart`).
 */
export function AccessGateProvider({ children }: { children: ReactNode }) {
  const tier = useAccessTier();

  // Keep the latest tier in a ref so `requireFeature` stays a stable callback
  // (it isn't recreated on every auth-state change, and reads fresh state).
  const tierRef = useRef(tier);
  tierRef.current = tier;

  // The tier whose gate is currently shown (`null` = hidden).
  const [gateTier, setGateTier] = useState<AccessTier | null>(null);

  const showAccessGate = useCallback((feature: Feature) => {
    haptic.light();
    setGateTier(FEATURE_REQUIRED_TIER[feature]);
  }, []);

  const requireFeature = useCallback(
    (feature: Feature) => {
      if (tierMeets(tierRef.current, FEATURE_REQUIRED_TIER[feature])) return true;
      showAccessGate(feature);
      return false;
    },
    [showAccessGate],
  );

  return (
    <AccessGateContext.Provider value={{ requireFeature, showAccessGate }}>
      {children}
      <AccessGateScreen tier={gateTier} onClose={() => setGateTier(null)} />
    </AccessGateContext.Provider>
  );
}

export function useAccessGate(): AccessGateContextValue {
  const ctx = useContext(AccessGateContext);
  if (!ctx)
    throw new Error("useAccessGate must be used within an AccessGateProvider");
  return ctx;
}

/** Convenience hook returning just the {@link AccessGateContextValue.requireFeature} guard. */
export function useRequireFeature() {
  return useAccessGate().requireFeature;
}
