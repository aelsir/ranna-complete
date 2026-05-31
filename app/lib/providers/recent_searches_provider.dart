/// Local-only history of the user's recent search queries, persisted to
/// SharedPreferences. Powers the search screen's empty state alongside the
/// trending chips. No server sync — search history is device-private.
library;

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _kRecentSearchesKey = 'recent_searches';
const _kMaxRecentSearches = 8;

/// Most-recent-first list of search terms the user actually searched for.
///
/// [add] is called from the search screen whenever a query returns results,
/// which means it fires on every debounced keystroke as the user types. To
/// keep the list clean we collapse prefixes: typing "احمد" records "ا", "اح",
/// "احم", "احمد" in turn, but each longer query removes the shorter prefix it
/// supersedes, leaving just "احمد".
class RecentSearchesNotifier extends StateNotifier<List<String>> {
  RecentSearchesNotifier() : super(const []) {
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    state = prefs.getStringList(_kRecentSearchesKey) ?? const [];
  }

  Future<void> _save() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(_kRecentSearchesKey, state);
  }

  void add(String raw) {
    final query = raw.trim();
    if (query.isEmpty) return;

    final next = <String>[query];
    for (final existing in state) {
      // Drop the exact dup and any shorter prefix the new query supersedes.
      if (existing == query) continue;
      if (query.startsWith(existing)) continue;
      next.add(existing);
    }

    final capped = next.take(_kMaxRecentSearches).toList();
    if (listEquals(capped, state)) return;
    state = capped;
    _save();
  }

  void remove(String query) {
    if (!state.contains(query)) return;
    state = state.where((q) => q != query).toList();
    _save();
  }

  void clear() {
    if (state.isEmpty) return;
    state = const [];
    _save();
  }
}

final recentSearchesProvider =
    StateNotifierProvider<RecentSearchesNotifier, List<String>>(
  (ref) => RecentSearchesNotifier(),
);
