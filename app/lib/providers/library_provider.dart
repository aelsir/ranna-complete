/// Per-user library: favorited tracks, listening history (deduped +
/// per-event variants), analytics summary, and the platform-popular
/// tracks rail.
///
/// Anything that's "data about THIS user's listening behavior" lives
/// here. Track / artist metadata fetches live in `people_provider.dart`.
library;

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:ranna/models/madha.dart';
import 'package:ranna/providers/auth_notifier.dart';
import 'package:ranna/providers/favorites_provider.dart';

import 'supabase_internals.dart';

// ============================================================================
// Favorites — full track list for the favorited IDs
// ============================================================================

/// Hydrates `favoritesProvider` (a `Set<String>` of track IDs) into
/// fully-joined track rows so the favorites screen can render them.
final favoriteTracksProvider =
    FutureProvider<List<MadhaWithRelations>>((ref) async {
  ref.keepAlive();
  final favoriteIds = ref.watch(favoritesProvider);
  if (favoriteIds.isEmpty) return [];

  final supabase = ref.read(supabaseProvider);
  try {
    final dynamic results = await supabase
        .from('v_tracks')
        .select()
        .inFilter('id', favoriteIds.toList())
        .order('created_at', ascending: false);
    return asList(results)
        .map((e) => MadhaWithRelations.fromJson(e))
        .toList();
  } catch (e, st) {
    debugPrint('⛔ favoriteTracksProvider error: $e');
    debugPrint('$st');
    return [];
  }
});

// ============================================================================
// Listening history — "Continue Listening" rail (deduped per track)
// ============================================================================

/// Last 10 distinct tracks the user listened to. Used by the home rail.
/// Deduped per track via the `v_recent_listens` view, so replaying the
/// same track three times shows up as a single recent entry.
final listeningHistoryProvider =
    FutureProvider<List<MadhaWithRelations>>((ref) async {
  final supabase = ref.read(supabaseProvider);
  // Re-fetch whenever auth identity changes (anon bootstrap, login,
  // logout + re-anon). Without this watch the provider would cache the
  // empty "null user" result indefinitely.
  final authUser = ref.watch(authNotifierProvider.select((s) => s.user));
  try {
    if (authUser == null) return [];
    final user = supabase.auth.currentUser ?? authUser;

    final dynamic historyRows = await supabase
        .from('v_recent_listens')
        .select('track_id')
        .eq('user_id', user.id)
        .order('listened_at', ascending: false)
        .limit(10);

    final trackIds = asList(historyRows)
        .map((r) => r['track_id'] as String)
        .toList();
    if (trackIds.isEmpty) return [];

    final dynamic tracksData =
        await supabase.from('v_tracks').select().inFilter('id', trackIds);

    final tracks = asList(tracksData)
        .map((e) => MadhaWithRelations.fromJson(e))
        .toList();

    // Preserve listening order (most-recent first) — the .inFilter() above
    // does NOT guarantee order, so we re-key by id and walk the original
    // listening list.
    final byId = {for (final t in tracks) t.id: t};
    return trackIds
        .map((id) => byId[id])
        .whereType<MadhaWithRelations>()
        .toList();
  } catch (e, st) {
    debugPrint('⛔ listeningHistoryProvider error: $e');
    debugPrint('$st');
    return [];
  }
});

// ============================================================================
// Full listening history — every play event individually
// ============================================================================

/// Single play event tied to its track + when it was played. Powers the
/// dedicated "سجل الاستماع" page where each play is shown individually
/// (vs. `listeningHistoryProvider` which dedupes per track for the home
/// "Continue Listening" rail).
class ListeningHistoryEntry {
  final MadhaWithRelations track;
  final DateTime playedAt;
  const ListeningHistoryEntry({required this.track, required this.playedAt});
}

final fullListeningHistoryProvider =
    FutureProvider<List<ListeningHistoryEntry>>((ref) async {
  final supabase = ref.read(supabaseProvider);
  final authUser = ref.watch(authNotifierProvider.select((s) => s.user));
  try {
    if (authUser == null) return [];
    final user = supabase.auth.currentUser ?? authUser;

    // 50 most recent play events for this user. NOT deduped — replaying
    // the same track three times shows three rows, each with its own
    // timestamp.
    final dynamic playRows = await supabase
        .from('user_plays')
        .select('track_id, played_at')
        .eq('user_id', user.id)
        .order('played_at', ascending: false)
        .limit(50);

    final plays = asList(playRows);
    if (plays.isEmpty) return [];

    final trackIds = plays
        .map((r) => r['track_id'] as String?)
        .whereType<String>()
        .toSet()
        .toList();

    final dynamic tracksData =
        await supabase.from('v_tracks').select().inFilter('id', trackIds);

    final byId = {
      for (final t in asList(tracksData))
        t['id'] as String: MadhaWithRelations.fromJson(t),
    };

    return plays
        .map((p) {
          final track = byId[p['track_id']];
          final playedAt =
              DateTime.tryParse(p['played_at'] as String? ?? '');
          if (track == null || playedAt == null) return null;
          return ListeningHistoryEntry(track: track, playedAt: playedAt);
        })
        .whereType<ListeningHistoryEntry>()
        .toList();
  } catch (e, st) {
    debugPrint('⛔ fullListeningHistoryProvider error: $e');
    debugPrint('$st');
    return [];
  }
});

// ============================================================================
// Analytics summary — global stats for the إحصائيات الاستماع page
// ============================================================================

/// Platform-wide analytics summary for the إحصائيات الاستماع page.
/// Mirrors the web's `getAnalyticsSummary` — these are GLOBAL stats across
/// all users, not per-user. (The web page is labeled per-user but actually
/// shows global; we're matching that behavior intentionally — a pre-existing
/// inconsistency flagged in the audit.)
class AnalyticsSummary {
  final int totalPlays;
  final int totalDurationSeconds;
  final int totalTracks;
  const AnalyticsSummary({
    required this.totalPlays,
    required this.totalDurationSeconds,
    required this.totalTracks,
  });
}

final analyticsSummaryProvider =
    FutureProvider<AnalyticsSummary>((ref) async {
  final supabase = ref.read(supabaseProvider);
  try {
    // Approved track count — exact head count, no rows transferred.
    final tracksResp = await supabase
        .from('tracks')
        .select('id')
        .eq('status', 'approved')
        .count(CountOption.exact);
    final trackCount = tracksResp.count;

    // Paginate user_plays in 1000-row chunks to compute count + duration sum.
    // Capped at 10 pages (10k plays) so this stays bounded as the table grows.
    // Audit note: at >100k plays this becomes the dashboard's slowest call;
    // replace with a SQL aggregate RPC.
    const pageSize = 1000;
    const maxPages = 10;
    int totalPlays = 0;
    int totalDuration = 0;
    for (int page = 0; page < maxPages; page++) {
      final from = page * pageSize;
      final to = from + pageSize - 1;
      final dynamic rows = await supabase
          .from('user_plays')
          .select('duration_seconds')
          .range(from, to);
      final list = asList(rows);
      if (list.isEmpty) break;
      totalPlays += list.length;
      for (final r in list) {
        final d = r['duration_seconds'];
        if (d is int) totalDuration += d;
      }
      if (list.length < pageSize) break;
    }

    return AnalyticsSummary(
      totalPlays: totalPlays,
      totalDurationSeconds: totalDuration,
      totalTracks: trackCount,
    );
  } catch (e, st) {
    debugPrint('⛔ analyticsSummaryProvider error: $e');
    debugPrint('$st');
    return const AnalyticsSummary(
      totalPlays: 0,
      totalDurationSeconds: 0,
      totalTracks: 0,
    );
  }
});

// ============================================================================
// Popular tracks — top 5 by play count, platform-wide
// ============================================================================

/// Top 5 most-played tracks platform-wide. Used by the إحصائيات page.
final popularTracksProvider =
    FutureProvider<List<MadhaWithRelations>>((ref) async {
  final supabase = ref.read(supabaseProvider);
  try {
    final dynamic rows = await supabase
        .from('v_tracks')
        .select()
        .order('play_count', ascending: false)
        .limit(5);
    return asList(rows)
        .map((e) => MadhaWithRelations.fromJson(e))
        .toList();
  } catch (e) {
    debugPrint('⛔ popularTracksProvider error: $e');
    return [];
  }
});
