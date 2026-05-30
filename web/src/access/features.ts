import { AccessTier } from "./tiers";

/**
 * Every capability in the app that may be gated behind an {@link AccessTier}.
 *
 * Single source of truth for "what does feature X require". To change a feature
 * from sign-in-only to paid later: change `AccessTier.Member` → `AccessTier.Premium`
 * on that one line in {@link FEATURE_REQUIRED_TIER} — the guard, the gate screen,
 * and the badge color all follow automatically.
 *
 * Web mirror of the Flutter `Feature` enum (`app/lib/access/feature.dart`). Only
 * `ViewLyrics` is enforced at a call site on web today; `DownloadTrack` and
 * `FollowProfile` are declared for vocabulary parity so that the day those
 * features ship on web, gating them is a one-line `requireFeature(...)` call.
 *
 * NOTE: this is UX gating, not security — the client decides what to OFFER. For
 * paid content you must ALSO enforce on the server (RLS / signed URLs).
 */
export enum Feature {
  DownloadTrack = "downloadTrack",
  ViewLyrics = "viewLyrics",
  FollowProfile = "followProfile",
}

/** The minimum tier a user must occupy to use each feature. */
export const FEATURE_REQUIRED_TIER: Record<Feature, AccessTier> = {
  [Feature.DownloadTrack]: AccessTier.Member,
  [Feature.ViewLyrics]: AccessTier.Member,
  [Feature.FollowProfile]: AccessTier.Member,
};
