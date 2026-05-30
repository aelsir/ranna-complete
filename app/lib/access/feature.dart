import 'access_tier.dart';

/// Every capability in the app that may be gated behind an [AccessTier].
///
/// This enum is the single source of truth for "what does feature X require".
/// To gate a new feature: add an entry here with its [requiredTier]. To change
/// a feature from sign-in-only to paid later: change `AccessTier.member` →
/// `AccessTier.premium` on that one line — the guard, the gate sheet, and the
/// badge color all follow automatically.
///
/// Enforcement is wired at the UI call sites via `requireFeature(...)` (see
/// `access_guard.dart`). NOTE: that is UX gating, not security — see the
/// caveat in `access_guard.dart` before relying on it for paid content.
enum Feature {
  downloadTrack(requiredTier: AccessTier.member),
  viewLyrics(requiredTier: AccessTier.member);

  const Feature({required this.requiredTier});

  /// The minimum tier a user must occupy to use this feature.
  final AccessTier requiredTier;
}
