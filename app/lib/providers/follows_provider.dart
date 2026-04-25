import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart' hide AuthState;

import 'auth_notifier.dart';

/// Composite follow-target identifier.
///
/// Stored in state as `"$type:$id"` so a single Set can hold all four
/// follow types (artist / author / tariqa / fan) without a custom equality.
typedef FollowKey = String;

FollowKey _key(String type, String id) => '$type:$id';

/// Tracks the set of (target_type, target_id) the current user follows.
///
/// State is hydrated from `user_follows` whenever the auth user_id changes
/// (anon bootstrap, anon→email upgrade, sign-out → re-anon). Toggles are
/// optimistic — the UI flips immediately, then the server insert/delete
/// fires. On failure we revert and surface the error via the return value
/// so the screen can show a snackbar.
class FollowsNotifier extends StateNotifier<Set<FollowKey>> {
  final Ref _ref;
  String? _hydratedForUserId;

  FollowsNotifier(this._ref) : super(<FollowKey>{}) {
    _ref.listen<AuthState>(authNotifierProvider, (prev, next) {
      final userId = next.user?.id;
      if (userId == null) return;
      if (userId == _hydratedForUserId) return;
      _hydratedForUserId = userId;
      // Fire-and-forget — auth bootstrap must not block on network.
      // ignore: discarded_futures
      _hydrate(userId);
    }, fireImmediately: true);
  }

  bool isFollowing(String type, String id) =>
      state.contains(_key(type, id));

  Future<void> _hydrate(String userId) async {
    try {
      final client = Supabase.instance.client;
      final rows = await client
          .from('user_follows')
          .select('target_type, target_id')
          .eq('user_id', userId);

      final next = <FollowKey>{};
      for (final r in rows) {
        final t = r['target_type'] as String?;
        final i = r['target_id'] as String?;
        if (t != null && i != null) next.add(_key(t, i));
      }
      state = next;
    } catch (e) {
      debugPrint('⛔ FollowsNotifier hydrate failed: $e');
    }
  }

  /// Toggle follow state. Returns the NEW state (`true` = now following,
  /// `false` = unfollowed). Throws on network error so the caller can
  /// revert UI / show a snackbar — the optimistic update is reverted
  /// internally before re-throwing.
  Future<bool> toggle(String type, String id) async {
    final client = Supabase.instance.client;
    final user = client.auth.currentUser;
    if (user == null) {
      throw StateError('Cannot follow without an authenticated user');
    }

    final key = _key(type, id);
    final wasFollowing = state.contains(key);
    final willFollow = !wasFollowing;

    // Optimistic update.
    state = wasFollowing
        ? (state.toSet()..remove(key))
        : (state.toSet()..add(key));

    try {
      if (willFollow) {
        await client.from('user_follows').insert({
          'user_id': user.id,
          'target_type': type,
          'target_id': id,
        });
      } else {
        await client
            .from('user_follows')
            .delete()
            .eq('user_id', user.id)
            .eq('target_type', type)
            .eq('target_id', id);
      }
      return willFollow;
    } catch (e) {
      // Revert.
      state = wasFollowing
          ? (state.toSet()..add(key))
          : (state.toSet()..remove(key));
      rethrow;
    }
  }
}

final followsProvider =
    StateNotifierProvider<FollowsNotifier, Set<FollowKey>>(
  (ref) => FollowsNotifier(ref),
);

/// Convenience: watch a single follow flag.
final isFollowingProvider =
    Provider.family<bool, ({String type, String id})>((ref, target) {
  final follows = ref.watch(followsProvider);
  return follows.contains(_key(target.type, target.id));
});
