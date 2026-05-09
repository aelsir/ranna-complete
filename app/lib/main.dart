import 'package:audio_session/audio_session.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_web_plugins/url_strategy.dart';
import 'package:sentry_flutter/sentry_flutter.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:ranna/app.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:ranna/services/audio_player_service.dart';
import 'package:ranna/db/local_db.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  usePathUrlStrategy();

  const sentryDsn = String.fromEnvironment('SENTRY_DSN', defaultValue: '');

  if (sentryDsn.isNotEmpty) {
    // ── Production: Sentry enabled ──
    await SentryFlutter.init(
      (options) {
        options.dsn = sentryDsn;
        options.tracesSampleRate = 0.2;
        options.environment = kReleaseMode ? 'production' : 'development';
        options.sendDefaultPii = false;
      },
      appRunner: () async => _startApp(),
    );
  } else {
    // ── Development: no Sentry, just console logging ──
    FlutterError.onError = (details) {
      FlutterError.presentError(details);
      debugPrint('━━━ FLUTTER ERROR ━━━');
      debugPrint(details.exceptionAsString());
      debugPrint('${details.stack}');
    };

    PlatformDispatcher.instance.onError = (error, stack) {
      debugPrint('━━━ PLATFORM ERROR ━━━');
      debugPrint('$error');
      debugPrint('$stack');
      return true;
    };

    await _startApp();
  }
}

Future<void> _startApp() async {
  // Pre-warm SharedPreferences cache so FavoritesNotifier._load() is instant
  await SharedPreferences.getInstance();

  const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');

  if (supabaseUrl.isEmpty || supabaseAnonKey.isEmpty) {
    throw Exception(
      'MISSING SUPABASE CREDENTIALS. '
      'Please run the app with: flutter run --dart-define-from-file=env.json',
    );
  }

  await Supabase.initialize(url: supabaseUrl, anonKey: supabaseAnonKey);

  // Initialize local SQLite database for offline downloads
  await LocalDb.init();

  // ── AudioSession configuration (fire-and-forget) ──────────────────────
  // This pins the iOS AVAudioSession to `.playback` so playback survives
  // backgrounding + the inter-track silence (otherwise the player
  // continues "playing" with position ticking but no audio output). Sets
  // Android audio attributes for media.
  //
  // We deliberately DON'T await this. The audio_session package's native
  // plugin can hang forever during init on a fresh install (e.g. before
  // a `pod install` re-link picks up the new dependency) — that would
  // turn the app into a permanent white screen since `runApp` would
  // never get called. Better to boot with a default session (works fine
  // in foreground) than to hang on bootstrap. See plan: "Fix Background
  // Auto-Advance + Lock-Screen Playback".
  // ignore: discarded_futures
  _configureAudioSession();

  // Initialize native audio controls (lock screen, notification)
  audioHandler = await initAudioHandler();

  runApp(const ProviderScope(child: RannaApp()));
}

Future<void> _configureAudioSession() async {
  try {
    // Cap the wait so a stuck native plugin can't keep this orphaned
    // task running indefinitely. 5 s is generous — a healthy plugin
    // resolves in tens of milliseconds.
    final session = await AudioSession.instance.timeout(
      const Duration(seconds: 5),
    );
    await session.configure(
      AudioSessionConfiguration(
        avAudioSessionCategory: AVAudioSessionCategory.playback,
        avAudioSessionCategoryOptions:
            AVAudioSessionCategoryOptions.allowBluetooth |
            AVAudioSessionCategoryOptions.allowBluetoothA2dp |
            AVAudioSessionCategoryOptions.allowAirPlay,
        avAudioSessionMode: AVAudioSessionMode.defaultMode,
        androidAudioAttributes: const AndroidAudioAttributes(
          contentType: AndroidAudioContentType.music,
          flags: AndroidAudioFlags.none,
          usage: AndroidAudioUsage.media,
        ),
        androidAudioFocusGainType: AndroidAudioFocusGainType.gain,
        androidWillPauseWhenDucked: true,
      ),
    );
    debugPrint('✅ AudioSession configured for playback');
  } catch (e, st) {
    // Non-fatal — app still works, just with the platform default session
    // category (background playback may be less reliable on iOS).
    debugPrint('⚠️ AudioSession configure failed (non-fatal): $e\n$st');
  }
}
