import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/auth_notifier.dart';
import 'access_tier.dart';
import 'feature.dart';

/// The current user's [AccessTier], derived from auth (and, in the future,
/// subscription) state.
///
/// This is the ONE place that maps app state → tier. Everything else asks
/// `canAccessProvider(feature)` instead of inspecting auth directly, so when a
/// new tier source appears (paid subscriptions) it gets wired in here and no
/// call site changes.
final accessTierProvider = Provider<AccessTier>((ref) {
  final auth = ref.watch(authNotifierProvider);

  // Until anonymous bootstrap lands, treat as guest — never grant access
  // optimistically.
  if (auth.loading) return AccessTier.guest;

  // Anonymous session → guest. A real account → member.
  if (auth.isAnonymous) return AccessTier.guest;

  // ── Premium seam (subscriptions not shipped yet) ───────────────────────
  // When paid tiers arrive, watch a `subscriptionProvider` here and return
  // `AccessTier.premium` for active subscribers, e.g.:
  //
  //   if (ref.watch(subscriptionProvider).isActive) return AccessTier.premium;
  //
  // Nothing else in the access layer needs to change.

  return AccessTier.member;
});

/// Whether the current user may use [feature]. Watch this to drive gated UI
/// (e.g. show/hide a lock badge). Enforce taps with `requireFeature(...)`.
final canAccessProvider = Provider.family<bool, Feature>((ref, feature) {
  return ref.watch(accessTierProvider).meets(feature.requiredTier);
});
