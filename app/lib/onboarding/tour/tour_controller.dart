/// Bookkeeping for the in-context "mini onboarding" spotlight tours.
///
/// Three tours exist today:
///   • mini_player   — one-step hint on the mini player bar ("open the full
///                     player"), shown the first time a track plays.
///   • full_player   — up to two steps inside the full player (lyrics +
///                     download). Internally tracked as two independent step
///                     flags so a first track WITHOUT lyrics can still teach
///                     download now and lyrics on a later track.
///   • follow        — one step on the profile-page follow button.
///
/// Rules:
///   1. Each step is shown ONCE ever (skip counts as seen). Flags persist in
///      SharedPreferences.
///   2. Only one tour can be on screen at a time. There is deliberately no
///      per-session lock beyond that: each tour fires on a different surface
///      (first play / first full-player open / first profile visit), is
///      once-ever, and deferring one to "next session" read as broken.
///   3. Nothing shows until first-run onboarding is completed/skipped.
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:ranna/onboarding/onboarding_prefs.dart';
import 'package:ranna/services/mixpanel_service.dart';

/// Step ids — each maps to one persisted "seen" flag.
abstract final class TourStepIds {
  static const miniPlayer = 'mini_player';
  static const miniPlayerDismiss = 'mini_player_dismiss';
  static const lyrics = 'lyrics';
  static const download = 'download';
  static const favorite = 'favorite';
  static const follow = 'follow';
  static const searchLyrics = 'search_lyrics';
}

/// Tour names — used for analytics.
abstract final class TourNames {
  static const miniPlayer = 'mini_player';
  static const fullPlayer = 'full_player';
  static const follow = 'follow';
  static const search = 'search';
}

final tourControllerProvider = Provider<TourController>(
  (ref) => TourController(ref),
);

/// The id of the tour step currently spotlighted, or null when no tour is
/// showing. Target widgets watch this to render their "activated" look while
/// being taught — the lyrics/download icons go gold, the heart goes red, the
/// mini player's border turns gold — instead of an extra ring being drawn
/// around them.
final activeTourStepProvider = StateProvider<String?>((ref) => null);

class TourController {
  TourController(this._ref);
  final Ref _ref;

  /// True while a tour overlay is on screen (guards double-triggers).
  static bool _active = false;

  SharedPreferences get _prefs => _ref.read(sharedPreferencesProvider);

  bool seen(String stepId) => _prefs.getBool('tour_${stepId}_seen') ?? false;

  void markSeen(String stepId) {
    _prefs.setBool('tour_${stepId}_seen', true);
  }

  /// Whether [tourName] may start right now for the given (already unseen-
  /// filtered) steps.
  bool canStart(String tourName, Iterable<String> stepIds) {
    if (_active) return false;
    if (!_ref.read(onboardingCompletedProvider)) return false;
    if (stepIds.isEmpty) return false;
    if (stepIds.every(seen)) return false;
    return true;
  }

  /// Claim the active slot. Call right before presenting the overlay.
  void begin(String tourName) {
    _active = true;
    _track('tour_shown', {'tour': tourName});
  }

  /// Point the spotlight: the widget whose step id this is renders its
  /// "activated" look while set.
  void setActiveStep(String? stepId) {
    _ref.read(activeTourStepProvider.notifier).state = stepId;
  }

  /// Runs on EVERY tour exit (next-through, skip, bail-out). Clears the
  /// highlight here — through the app-level Ref, not the dying overlay
  /// widget — so no spotlighted element stays lit after the tour.
  void end() {
    _active = false;
    setActiveStep(null);
  }

  void trackStepDone(String tourName, String stepId) {
    _track('tour_step_done', {'tour': tourName, 'step': stepId});
  }

  void trackSkipped(String tourName, String atStepId) {
    _track('tour_skipped', {'tour': tourName, 'at_step': atStepId});
  }

  void _track(String event, Map<String, dynamic> props) {
    if (MixpanelService.isInitialized) {
      MixpanelService.instance.track(event, properties: props);
    }
  }
}
