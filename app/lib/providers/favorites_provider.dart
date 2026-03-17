import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _kFavoritesKey = 'favorite_track_ids';

/// Manages favorite track IDs, persisted to local storage via SharedPreferences.
/// In the future this will sync with the user's account.
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
    if (state.contains(trackId)) {
      state = {...state}..remove(trackId);
    } else {
      state = {...state, trackId};
    }
    await _save();
  }
}

final favoritesProvider =
    StateNotifierProvider<FavoritesNotifier, Set<String>>((ref) {
  return FavoritesNotifier();
});
