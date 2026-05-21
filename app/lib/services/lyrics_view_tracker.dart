/// Client-side recorder for lyrics-view events on the Flutter app.
///
/// Fires the `record_lyrics_view` Supabase RPC when the user opens the
/// lyrics surface on a track. Tracking errors are swallowed — a failed
/// log must never break the player or the lyrics UI.
///
/// A short in-memory dedupe window prevents double-counting when
/// rebuilds or the auto-open preference fire twice in quick succession.
library;

import 'package:flutter/foundation.dart'
    show kIsWeb, debugPrint, defaultTargetPlatform, TargetPlatform;
import 'package:supabase_flutter/supabase_flutter.dart';

class LyricsViewTracker {
  LyricsViewTracker._();
  static final LyricsViewTracker instance = LyricsViewTracker._();

  static const Duration _dedupeWindow = Duration(seconds: 5);

  // (track_id, play_id) → last fire timestamp
  final Map<String, DateTime> _recent = {};

  /// Record one "user opened the lyrics view" event. Safe to call
  /// fire-and-forget — never throws, never blocks the caller.
  Future<void> record({required String trackId, String? playId}) async {
    if (trackId.isEmpty) return;

    final key = '$trackId:${playId ?? "null"}';
    final now = DateTime.now();
    final last = _recent[key];
    if (last != null && now.difference(last) < _dedupeWindow) return;
    _recent[key] = now;

    // Bounded LRU-ish cleanup so the map doesn't grow forever.
    if (_recent.length > 256) {
      _recent.removeWhere((_, ts) => now.difference(ts) > _dedupeWindow);
    }

    try {
      final supabase = Supabase.instance.client;
      await supabase.rpc(
        'record_lyrics_view',
        params: {
          'p_track_id': trackId,
          'p_play_id': playId,
          'p_device_type': _deviceType(),
        },
      );
    } catch (e) {
      debugPrint('⚠️ lyrics_view_tracker: $e');
    }
  }

  String _deviceType() {
    if (kIsWeb) return 'web';
    switch (defaultTargetPlatform) {
      case TargetPlatform.iOS:
        return 'ios';
      case TargetPlatform.android:
        return 'android';
      case TargetPlatform.macOS:
        return 'macos';
      case TargetPlatform.windows:
        return 'windows';
      case TargetPlatform.linux:
        return 'linux';
      case TargetPlatform.fuchsia:
        return 'fuchsia';
    }
  }
}
