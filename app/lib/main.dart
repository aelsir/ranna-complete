import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_web_plugins/url_strategy.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:ranna/app.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:ranna/services/audio_player_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  usePathUrlStrategy();

  // ── Global error logging ──────────────────────────────────────────────────
  FlutterError.onError = (details) {
    FlutterError.presentError(details);
    debugPrint('━━━ FLUTTER ERROR ━━━');
    debugPrint('${details.exceptionAsString()}');
    debugPrint('${details.stack}');
  };

  PlatformDispatcher.instance.onError = (error, stack) {
    debugPrint('━━━ PLATFORM ERROR ━━━');
    debugPrint('$error');
    debugPrint('$stack');
    return true;
  };

  // Pre-warm SharedPreferences cache so FavoritesNotifier._load() is instant
  await SharedPreferences.getInstance();

  await Supabase.initialize(
    url: const String.fromEnvironment('SUPABASE_URL'),
    anonKey: const String.fromEnvironment('SUPABASE_ANON_KEY'),
  );

  // Initialize native audio controls (lock screen, notification)
  audioHandler = await initAudioHandler();

  runApp(const ProviderScope(child: RannaApp()));
}
