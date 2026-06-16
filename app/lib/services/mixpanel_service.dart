import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:mixpanel_flutter/mixpanel_flutter.dart';
import 'package:mixpanel_flutter_session_replay/mixpanel_flutter_session_replay.dart';

/// Singleton wrapper around the Mixpanel Flutter SDK.
///
/// Initialised once in `_startApp()` (main.dart). After that, any file can
/// call `MixpanelService.instance.track(...)` without managing the lifecycle.
///
/// Token is injected via `--dart-define-from-file=env.json` at build time,
/// following the same pattern as Supabase and Sentry credentials.
class MixpanelService {
  MixpanelService._();
  static MixpanelService? _instance;
  late final Mixpanel _mixpanel;

  /// Session replay instance, attached once it has finished initialising in
  /// the widget tree (see `RannaApp`). Null until then, or when replay is
  /// disabled (no token). Identity changes are forwarded to it so replays
  /// stay attributed to the same user as analytics events.
  MixpanelSessionReplay? _sessionReplay;

  /// Access the singleton. Throws if [init] has not been called yet.
  static MixpanelService get instance {
    assert(_instance != null, 'MixpanelService.init() must be called first');
    return _instance!;
  }

  /// Whether the service has been initialised (safe to call before init).
  static bool get isInitialized => _instance != null;

  /// Initialise once at app startup. Idempotent — second call is a no-op.
  static Future<void> init(String token) async {
    if (_instance != null) return;
    final svc = MixpanelService._();
    svc._mixpanel = await Mixpanel.init(
      token,
      trackAutomaticEvents: true,
    );

    // Register super properties that auto-attach to every event.
    svc._mixpanel.registerSuperProperties({
      'platform': _currentPlatform,
      'app_version': '3.1.4', // keep in sync with pubspec.yaml version
    });

    _instance = svc;
    debugPrint('✅ Mixpanel initialised');
  }

  // ───────────────────── Tracking ─────────────────────

  /// Track a named event with optional properties.
  void track(String eventName, {Map<String, dynamic>? properties}) {
    _mixpanel.track(eventName, properties: properties);
  }

  // ───────────────────── Identity ─────────────────────

  /// The current Mixpanel distinct ID (anonymous or identified). Used to
  /// associate session replays with the analytics identity.
  Future<String> getDistinctId() => _mixpanel.getDistinctId();

  /// Register the session replay instance once it has initialised. Forwards
  /// the current identity so the active recording is attributed correctly.
  void attachSessionReplay(MixpanelSessionReplay replay) {
    _sessionReplay = replay;
  }

  /// Call on login / signup / session restore when the user is authenticated.
  void identify(String userId) {
    _mixpanel.identify(userId);
    _sessionReplay?.identify(userId);
  }

  /// Set user profile properties (People).
  void peopleSet(String property, dynamic value) {
    _mixpanel.getPeople().set(property, value);
  }

  /// Set multiple user profile properties at once.
  void peopleSetAll(Map<String, dynamic> properties) {
    for (final entry in properties.entries) {
      _mixpanel.getPeople().set(entry.key, entry.value);
    }
  }

  /// Call on logout to generate a fresh anonymous ID.
  void reset() {
    _mixpanel.reset();
    // Re-point session replay at the new anonymous distinct ID so post-logout
    // recordings aren't still attributed to the signed-out user.
    final replay = _sessionReplay;
    if (replay != null) {
      _mixpanel.getDistinctId().then(replay.identify).catchError((_) {});
    }
  }

  // ───────────────────── Helpers ─────────────────────

  static String get _currentPlatform {
    if (kIsWeb) return 'web';
    try {
      if (Platform.isIOS) return 'ios';
      if (Platform.isAndroid) return 'android';
      if (Platform.isMacOS) return 'macos';
    } catch (_) {}
    return 'unknown';
  }

  /// Convenience getter for the current platform string (used by event
  /// properties that need an explicit `platform` value).
  static String get currentPlatform => _currentPlatform;

  /// Convenience getter for device type (matches audio_player_service's
  /// `_deviceType` values).
  static String get deviceType {
    if (kIsWeb) return 'web';
    try {
      if (Platform.isIOS) return 'ios';
      if (Platform.isAndroid) return 'android';
      if (Platform.isMacOS) return 'macos';
      if (Platform.isWindows) return 'windows';
      if (Platform.isLinux) return 'linux';
    } catch (_) {}
    return 'unknown';
  }
}
