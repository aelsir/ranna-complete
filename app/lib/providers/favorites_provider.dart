import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../db/local_db.dart';

const _kFavoritesKey = 'favorite_track_ids';

/// Manages favorite track IDs with optimistic UI.
///
/// 1. Toggle is instant (SharedPreferences)
/// 2. Syncs to Supabase `user_favorites` when online
/// 3. Queues to `pending_actions` when offline → synced later by SyncService
class FavoritesNotifier extends StateNotifier<Set<String>> {
  FavoritesNotifier() : super({}) {
    _load();
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

    // 1. Optimistic UI update — instant
    if (wasFavorite) {
      state = {...state}..remove(trackId);
    } else {
      state = {...state, trackId};
    }
    await _save();

    // 2. Try Supabase sync (if authenticated)
    final userId = Supabase.instance.client.auth.currentUser?.id;
    if (userId == null) return; // Anonymous user — local only

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
      // 3. Queue for later sync when back online
      debugPrint('📦 Queued ${wasFavorite ? "unfavorite" : "favorite"} for $trackId');
      await LocalDb.enqueueAction(
        wasFavorite ? 'unfavorite' : 'favorite',
        {'user_id': userId, 'track_id': trackId},
      );
    }
  }
}

final favoritesProvider =
    StateNotifierProvider<FavoritesNotifier, Set<String>>((ref) {
  return FavoritesNotifier();
});
