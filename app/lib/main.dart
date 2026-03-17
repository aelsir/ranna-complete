import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_web_plugins/url_strategy.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:ranna/app.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  usePathUrlStrategy();

  // ── Global error logging ──────────────────────────────────────────────────
  // Flutter framework errors (layout, rendering, etc.)
  FlutterError.onError = (details) {
    FlutterError.presentError(details);
    debugPrint('━━━ FLUTTER ERROR ━━━');
    debugPrint('${details.exceptionAsString()}');
    debugPrint('${details.stack}');
  };

  // Async / uncaught errors
  PlatformDispatcher.instance.onError = (error, stack) {
    debugPrint('━━━ PLATFORM ERROR ━━━');
    debugPrint('$error');
    debugPrint('$stack');
    return true;
  };

  await Supabase.initialize(
    url: const String.fromEnvironment('SUPABASE_URL'),
    anonKey: const String.fromEnvironment('SUPABASE_ANON_KEY'),
  );

  runApp(const ProviderScope(child: RannaApp()));
}
