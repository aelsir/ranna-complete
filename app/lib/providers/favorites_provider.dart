import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart' hide AuthState;

import '../db/local_db.dart';
import 'auth_notifier.dart';

const _kFavoritesKey = 'favorite_track_ids';

/// Manages favorite track IDs with optimistic UI + server sync.
///
/// 1. Toggle is instant (SharedPreferences).
/// 2. Syncs to Supabase `user_favorites` whenever a user_id is available
///    (thanks to anonymous-first auth, this is essentially always).
/// 3. Queues to `pending_actions` on network failure → SyncService flushes.
/// 4. On auth-change (anon bootstrap OR anon→email upgrade) merges local
///    favorites into the server once.
class FavoritesNotifier extends StateNotifier<Set<String>> {
  final Ref _ref;
  final Set<String> _mergedForUserIds = <String>{};

  FavoritesNotifier(this._ref) : super({}) {
    _load();
    // React to auth state changes: whenever the user.id first becomes known
    // OR changes, merge local favorites into the server.
    _ref.listen<AuthState>(authNotifierProvider, (prev, next) {
      final userId = next.user?.id;
      if (userId != null && !_mergedForUserIds.contains(userId)) {
        _mergedForUserIds.add(userId);
        // Fire-and-forget — must not block auth state propagation.
        // ignore: discarded_futures
        mergeWithServer(userId);
      }
    }, fireImmediately: true);
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final ids = prefs.getStringList(_kFavoritesKey) ?? [];
    state = ids.toSet();
  }

  Future<void> _save() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(_kFavoritesKey, state.toList());
  }

  bool isFavorite(String trackId) => state.contains(trackId);

  Future<void> toggle(String trackId) async {
    final wasFavorite = state.contains(trackId);

    // 1. Optimistic UI update — instant.
    if (wasFavorite) {
      state = {...state}..remove(trackId);
    } else {
      state = {...state, trackId};
    }
    await _save();

    // 2. Try Supabase sync. Read user_id from our AuthNotifier (which
    // guarantees an anon-or-real user is always available once bootstrap
    // completes).
    final userId = _ref.read(authNotifierProvider).user?.id;
    if (userId == null) return; // Still bootstrapping — local-only for now.

    try {
      if (wasFavorite) {
        await Supabase.instance.client
            .from('user_favorites')
            .delete()
            .eq('user_id', userId)
            .eq('track_id', trackId);
      } else {
        await Supabase.instance.client
            .from('user_favorites')
            .insert({'user_id': userId, 'track_id': trackId});
      }
    } catch (e) {
      // 3. Queue for later sync when back online.
      debugPrint(
        '[favorites] queued ${wasFavorite ? "unfavorite" : "favorite"} for $trackId: $e',
      );
      await LocalDb.enqueueAction(
        wasFavorite ? 'unfavorite' : 'favorite',
        {'user_id': userId, 'track_id': trackId},
      );
    }
  }

  /// One-shot merge: upload any local favorites that aren't already on the
  /// server, then union the server's favorites into local state.
  ///
  /// Called from the auth-state listener whenever a new user.id becomes
  /// known. Idempotent — safe to re-invoke (`ignoreDuplicates: true`).
  Future<void> mergeWithServer(String userId) async {
    try {
      // 1. Fetch server favorites for this user.
      final serverRows = await Supabase.instance.client
          .from('user_favorites')
          .select('track_id')
          .eq('user_id', userId);
      final serverIds = <String>{
        for (final row in (serverRows as List))
          if (row is Map && row['track_id'] is String) row['track_id'] as String,
      };

      // 2. Upsert any local-only IDs.
      final localOnly = state.difference(serverIds).toList();
      if (localOnly.isNotEmpty) {
        await Supabase.instance.client.from('user_favorites').upsert(
          [
            for (final trackId in localOnly)
              {'user_id': userId, 'track_id': trackId},
          ],
          onConflict: 'user_id,track_id',
          ignoreDuplicates: true,
        );
      }

      // 3. Union server + local and persist.
      final union = {...state, ...serverIds};
      if (union.length != state.length) {
        state = union;
        await _save();
      }
    } catch (e) {
      debugPrint('[favorites] mergeWithServer failed for $userId: $e');
      // Silent — toggle() + SyncService will heal state eventually.
    }
  }
}

final favoritesProvider =
    StateNotifierProvider<FavoritesNotifier, Set<String>>((ref) {
  return FavoritesNotifier(ref);
});
