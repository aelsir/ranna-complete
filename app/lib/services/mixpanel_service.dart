import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:mixpanel_flutter/mixpanel_flutter.dart';

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

  /// Call on login / signup / session restore when the user is authenticated.
  void identify(String userId) {
    _mixpanel.identify(userId);
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
