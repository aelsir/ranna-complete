/// First-run onboarding state + taste-pick persistence.
///
/// Everything here is device-local (SharedPreferences). The picks the user
/// makes in the taste step are stored so the home feed can personalize from
/// them later; nothing is synced to the backend yet.
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:ranna/providers/supabase_internals.dart';

const _kOnboardingCompletedKey = 'onboarding_completed';
const _kTasteContentTypesKey = 'taste_content_types';
const _kTasteTuruqKey = 'taste_turuq';

/// Hardcoded floor for the welcome-page counter. The library holds >2500
/// tracks; the real number is fetched async and the counter animates up to
/// it, but this renders instantly and survives offline first launches.
const kFallbackTrackCount = 2500;

/// The app-wide [SharedPreferences] instance, captured during bootstrap.
///
/// `main.dart` already awaits `SharedPreferences.getInstance()` to pre-warm
/// the cache; the same instance is injected here via a ProviderScope override
/// so synchronous consumers (the router redirect, the tour controller) can
/// read flags without an async gap.
final sharedPreferencesProvider = Provider<SharedPreferences>(
  (ref) => throw UnimplementedError(
    'sharedPreferencesProvider must be overridden in main.dart',
  ),
);

/// Whether the user has been through (or skipped) the first-run onboarding.
/// The router redirect reads this on every navigation to `/`.
final onboardingCompletedProvider = StateProvider<bool>((ref) {
  return ref
          .read(sharedPreferencesProvider)
          .getBool(_kOnboardingCompletedKey) ??
      false;
});

/// Mark onboarding done (idempotent). Updates the in-memory flag the router
/// reads AND persists it, so neither a hot navigation nor the next cold
/// launch shows the flow again.
void completeOnboarding(WidgetRef ref) {
  ref.read(sharedPreferencesProvider).setBool(_kOnboardingCompletedKey, true);
  ref.read(onboardingCompletedProvider.notifier).state = true;
}

/// Persist the taste-picker selections.
///
/// [contentTypes] holds `tracks.content_type` values ('madha', 'quran',
/// 'inshad', 'dhikr', 'lecture'); [turuqIds] holds `turuq.id` values plus
/// the local sentinels 'none' (ليس لدي) and 'other' (أخرى).
///
/// Stored twice: SharedPreferences (instant, offline, drives the device's
/// feed) and the Supabase auth user's metadata (anonymous sessions are real
/// auth users, and metadata survives the anon → member upgrade, so the picks
/// follow the account across devices).
void saveTastePicks(
  WidgetRef ref, {
  required Set<String> contentTypes,
  required Set<String> turuqIds,
}) {
  final prefs = ref.read(sharedPreferencesProvider);
  prefs.setStringList(_kTasteContentTypesKey, contentTypes.toList());
  prefs.setStringList(_kTasteTuruqKey, turuqIds.toList());

  // Fire-and-forget server sync; the device copy above is the fallback.
  // ignore: discarded_futures
  _syncTastePicksToProfile(
    ref.read(supabaseProvider),
    contentTypes: contentTypes,
    turuqIds: turuqIds,
  );
}

Future<void> _syncTastePicksToProfile(
  SupabaseClient supabase, {
  required Set<String> contentTypes,
  required Set<String> turuqIds,
}) async {
  try {
    if (supabase.auth.currentUser == null) {
      // Fresh install: onboarding renders before the anonymous session is
      // bootstrapped (AuthNotifier is lazy — it only spins up with the main
      // shell). Wait for the first session instead of dropping the write.
      await supabase.auth.onAuthStateChange
          .firstWhere((s) => s.session != null)
          .timeout(const Duration(seconds: 60));
    }
    await supabase.auth.updateUser(
      UserAttributes(
        data: {
          'taste_content_types': contentTypes.toList(),
          'taste_turuq': turuqIds.toList(),
        },
      ),
    );
  } catch (_) {
    // Offline / no session within the window — the local copy stands.
  }
}

/// Content types the user said they like. Empty = never picked / picked none.
final tasteContentTypesProvider = Provider<List<String>>((ref) {
  return ref
          .read(sharedPreferencesProvider)
          .getStringList(_kTasteContentTypesKey) ??
      const [];
});

/// طريقة ids the user said they like. Empty = never picked / picked none.
final tasteTuruqProvider = Provider<List<String>>((ref) {
  return ref.read(sharedPreferencesProvider).getStringList(_kTasteTuruqKey) ??
      const [];
});

/// Total approved tracks in the library, for the welcome-page counter.
/// A HEAD count query — no rows transferred. Falls back to
/// [kFallbackTrackCount] on error or if the count comes back suspiciously low.
final libraryTrackCountProvider = FutureProvider<int>((ref) async {
  final supabase = ref.read(supabaseProvider);
  try {
    final count = await supabase.from('v_tracks').count(CountOption.exact);
    return count >= kFallbackTrackCount ? count : kFallbackTrackCount;
  } catch (_) {
    return kFallbackTrackCount;
  }
});
