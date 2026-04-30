import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
// supabase_flutter exports its own `AuthState` — hide it so our
// `auth_notifier.dart` export wins.
import 'package:supabase_flutter/supabase_flutter.dart' hide AuthState;

import 'auth_notifier.dart';

/// The single user-row state we care about across the app's "settings"
/// surfaces (الإشعارات toggle, بيانات الحساب form).
///
/// Where each field lives:
///
/// | Field                | Source                                   |
/// |----------------------|------------------------------------------|
/// | displayName          | `user_profiles.display_name`             |
/// | country              | `user_profiles.country`                  |
/// | phoneNumber          | `auth.users.user_metadata.phone_number`  |
/// | emailNotifications   | `user_profiles.email_notifications`      |
/// | pushNotifications    | `user_profiles.push_notifications`       |
///
/// `displayName` and `country` are *also* mirrored into
/// `auth.users.user_metadata` on every write so the session reflects them
/// without a refetch.
@immutable
class UserProfile {
  final String id;
  final String displayName;
  final String country;
  final String phoneNumber;
  final bool emailNotifications;
  final bool pushNotifications;

  const UserProfile({
    required this.id,
    this.displayName = '',
    this.country = '',
    this.phoneNumber = '',
    this.emailNotifications = true,
    this.pushNotifications = true,
  });

  UserProfile copyWith({
    String? displayName,
    String? country,
    String? phoneNumber,
    bool? emailNotifications,
    bool? pushNotifications,
  }) {
    return UserProfile(
      id: id,
      displayName: displayName ?? this.displayName,
      country: country ?? this.country,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      emailNotifications: emailNotifications ?? this.emailNotifications,
      pushNotifications: pushNotifications ?? this.pushNotifications,
    );
  }
}

@immutable
class UserProfileState {
  /// `null` while no signed-in user OR before the first hydrate completes.
  final UserProfile? profile;

  /// True during a hydrate. Toggle/update operations are optimistic and do
  /// NOT flip this flag.
  final bool loading;

  /// Last hydrate error if any. Cleared on next successful hydrate. Write
  /// errors are *thrown* to the caller (so the screen can render a
  /// snackbar) rather than parked here.
  final String? error;

  const UserProfileState({
    this.profile,
    this.loading = false,
    this.error,
  });

  UserProfileState copyWith({
    UserProfile? profile,
    bool? loading,
    String? error,
    bool clearProfile = false,
    bool clearError = false,
  }) {
    return UserProfileState(
      profile: clearProfile ? null : (profile ?? this.profile),
      loading: loading ?? this.loading,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

/// Owns the current user's row from `user_profiles` plus phone-from-metadata.
/// Hydrates automatically on auth user-id change (anon bootstrap, anon→email
/// upgrade, sign-out → re-anon). Screens read state via `ref.watch` and call
/// `updateProfileFields` / `setNotifications` to write.
class UserProfileNotifier extends StateNotifier<UserProfileState> {
  final Ref _ref;
  String? _hydratedForUserId;

  UserProfileNotifier(this._ref) : super(const UserProfileState()) {
    _ref.listen<AuthState>(authNotifierProvider, (prev, next) {
      final user = next.user;
      if (user == null) {
        // Sign-out before re-anon-bootstrap. Drop state; next user lands
        // and re-triggers hydrate.
        _hydratedForUserId = null;
        state = const UserProfileState();
        return;
      }
      // Anonymous users have no profile row to load (the `handle_new_user`
      // trigger only seeds for non-anon users), but we still want to clear
      // any prior real-user state.
      if (user.isAnonymous == true) {
        _hydratedForUserId = null;
        state = const UserProfileState();
        return;
      }
      if (user.id == _hydratedForUserId) return;
      _hydratedForUserId = user.id;
      // Fire-and-forget — auth state propagation must not block on network.
      // ignore: discarded_futures
      _hydrate(user);
    }, fireImmediately: true);
  }

  SupabaseClient get _client => Supabase.instance.client;

  Future<void> _hydrate(User user) async {
    state = state.copyWith(loading: true, clearError: true);
    try {
      final row = await _client
          .from('user_profiles')
          .select(
            'display_name, country, email_notifications, push_notifications',
          )
          .eq('id', user.id)
          .maybeSingle();

      // Phone is metadata-only; pull it from the live session, not the DB.
      final meta = user.userMetadata ?? const <String, dynamic>{};
      final phone = (meta['phone_number'] as String?) ?? '';

      state = UserProfileState(
        profile: UserProfile(
          id: user.id,
          displayName: (row?['display_name'] as String?) ?? '',
          country: (row?['country'] as String?) ?? '',
          phoneNumber: phone,
          emailNotifications:
              (row?['email_notifications'] as bool?) ?? true,
          pushNotifications:
              (row?['push_notifications'] as bool?) ?? true,
        ),
        loading: false,
      );
    } catch (e, st) {
      debugPrint('⛔ user profile hydrate failed: $e\n$st');
      state = state.copyWith(loading: false, error: e.toString());
    }
  }

  /// Manual rehydrate — useful when something out-of-band edits the row
  /// (admin tooling, a second logged-in device). Screens normally don't
  /// need to call this.
  Future<void> refresh() async {
    final user = _client.auth.currentUser;
    if (user == null || user.isAnonymous == true) return;
    await _hydrate(user);
  }

  /// Updates `display_name` + `country` in `user_profiles` AND mirrors all
  /// three fields (name, country, phone) into `auth.users.user_metadata` so
  /// the session reflects changes instantly. Phone is metadata-only.
  ///
  /// Optimistic: the in-memory state updates immediately; on network/RLS
  /// failure the prior state is restored and the error is rethrown.
  Future<void> updateProfileFields({
    required String displayName,
    required String country,
    required String phoneNumber,
  }) async {
    final user = _client.auth.currentUser;
    if (user == null) {
      throw StateError('Cannot update profile without an authenticated user');
    }
    final previous = state.profile;
    if (previous == null) {
      throw StateError('User profile not yet loaded');
    }

    state = state.copyWith(
      profile: previous.copyWith(
        displayName: displayName,
        country: country,
        phoneNumber: phoneNumber,
      ),
    );

    try {
      await _client.from('user_profiles').update({
        'display_name': displayName,
        'country': country,
      }).eq('id', user.id);

      await _client.auth.updateUser(
        UserAttributes(
          data: {
            'display_name': displayName,
            'country': country,
            'phone_number': phoneNumber,
          },
        ),
      );
    } catch (e) {
      // Revert.
      state = state.copyWith(profile: previous);
      rethrow;
    }
  }

  /// Flips both notification channels in lockstep — they're a single
  /// "notifications on/off" toggle in the UI today. The split lives in
  /// `user_profiles` so future granular controls (separate email vs push
  /// toggles) can be added without a schema change.
  Future<void> setNotifications(bool value) async {
    final user = _client.auth.currentUser;
    if (user == null) return;
    final previous = state.profile;
    if (previous == null) return;

    state = state.copyWith(
      profile: previous.copyWith(
        emailNotifications: value,
        pushNotifications: value,
      ),
    );

    try {
      await _client.from('user_profiles').update({
        'email_notifications': value,
        'push_notifications': value,
      }).eq('id', user.id);
    } catch (e) {
      // Revert.
      state = state.copyWith(profile: previous);
      rethrow;
    }
  }
}

final userProfileProvider =
    StateNotifierProvider<UserProfileNotifier, UserProfileState>(
  (ref) => UserProfileNotifier(ref),
);
