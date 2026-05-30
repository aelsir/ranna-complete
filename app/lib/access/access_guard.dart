import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'access_provider.dart';
import 'feature.dart';
import 'widgets/access_gate_sheet.dart';

/// Gate an action behind a [Feature]'s required tier.
///
/// Call this at the START of any handler for a gated action:
///
/// ```dart
/// onTap: () {
///   if (!requireFeature(context, ref, Feature.downloadTrack)) return;
///   // ...proceed; user is entitled.
/// }
/// ```
///
/// Returns `true` if the user may proceed. Otherwise shows the access gate
/// sheet (sign-in today, paywall once premium ships) and returns `false`.
///
/// ⚠️ This is UX gating, not security. The client decides what to OFFER. For
/// signed-in-only features that's fine. For *paid* content you must ALSO
/// enforce on the server (RLS / a filtered view that strips premium fields /
/// signed download URLs from an edge function that checks entitlement) — the
/// client check can always be bypassed.
bool requireFeature(BuildContext context, WidgetRef ref, Feature feature) {
  if (ref.read(canAccessProvider(feature))) return true;
  // ignore: discarded_futures — fire-and-forget; we only care about the bool.
  showAccessGateSheet(context, ref, feature);
  return false;
}
