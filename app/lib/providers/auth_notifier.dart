import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
// supabase_flutter also exports a type named `AuthState` that conflicts with
// ours below — hide it so our class name is unambiguous.
import 'package:supabase_flutter/supabase_flutter.dart' hide AuthState;
import 'package:supabase_flutter/supabase_flutter.dart' as sb show AuthState;

/// Immutable snapshot of the current auth state for the Ranna app.
///
/// `user`/`session` are null only during the initial bootstrap (before
/// `signInAnonymously` lands). After bootstrap every user always has a
/// session — anonymous or real.
@immutable
class AuthState {
  final Session? session;
  final User? user;

  /// True when the user exists but has no email identity (fresh install).
  final bool isAnonymous;

  /// True when the user has `admin` or `superuser` in `user_roles`.
  final bool isAdmin;

  /// True while initial session + anon bootstrap is resolving.
  final bool loading;

  const AuthState({
    this.session,
    this.user,
    this.isAnonymous = true,
    this.isAdmin = false,
    this.loading = true,
  });

  AuthState copyWith({
    Session? session,
    User? user,
    bool? isAnonymous,
    bool? isAdmin,
    bool? loading,
    bool clearSession = false,
    bool clearUser = false,
  }) {
    return AuthState(
      session: clearSession ? null : (session ?? this.session),
      user: clearUser ? null : (user ?? this.user),
      isAnonymous: isAnonymous ?? this.isAnonymous,
      isAdmin: isAdmin ?? this.isAdmin,
      loading: loading ?? this.loading,
    );
  }
}

/// Riverpod notifier that owns the auth session + anonymous bootstrap +
/// magic-link upgrade flow.
///
/// Mirrors the web app's `AuthContext` in
/// `web/src/context/AuthContext.tsx`. Consumers call:
///   ref.watch(authNotifierProvider)  // AuthState
///   ref.read(authNotifierProvider.notifier).signInWithMagicLink(email)
///   ref.read(authNotifierProvider.notifier).signOut()
class AuthNotifier extends StateNotifier<AuthState> {
  /// Guards against double-bootstrapping (hot reload, rapid state changes).
  /// Set true once we've kicked off the initial sign-in; `onAuthStateChange`
  /// callbacks never retrigger bootstrap.
  bool _bootstrapped = false;

  StreamSubscription<sb.AuthState>? _authSub;

  AuthNotifier() : super(const AuthState(loading: true)) {
    _init();
  }

  SupabaseClient get _client => Supabase.instance.client;

  Future<void> _init() async {
    // Subscribe first so we don't miss transition events during bootstrap.
    _authSub = _client.auth.onAuthStateChange.listen((data) {
      final session = data.session;
      if (session != null) {
        _applySession(session);
        _refreshIsAdmin();
      }
      // Session-ended events are handled explicitly in signOut() which
      // immediately re-bootstraps, so no null-session gap is ever exposed.
    });

    final existing = _client.auth.currentSession;
    if (existing != null) {
      _bootstrapped = true;
      _applySession(existing);
      await _refreshIsAdmin();
      return;
    }

    await _bootstrapAnonymous();
  }

  Future<void> _bootstrapAnonymous() async {
    if (_bootstrapped) return;
    _bootstrapped = true;
    try {
      await _client.auth.signInAnonymously();
      // onAuthStateChange will push the new session into state.
    } catch (e, stack) {
      debugPrint('[auth] anonymous bootstrap failed: $e\n$stack');
      state = state.copyWith(loading: false);
    }
  }

  void _applySession(Session session) {
    final user = session.user;
    state = state.copyWith(
      session: session,
      user: user,
      isAnonymous: user.isAnonymous == true,
      loading: false,
    );
  }

  /// Refresh `isAdmin` by calling the `is_admin_or_superuser` RPC.
  /// Anonymous users resolve to false without hitting the network.
  Future<void> _refreshIsAdmin() async {
    final user = state.user;
    if (user == null || state.isAnonymous) {
      state = state.copyWith(isAdmin: false);
      return;
    }
    try {
      final result = await _client.rpc('is_admin_or_superuser');
      state = state.copyWith(isAdmin: result == true);
    } catch (e) {
      debugPrint('[auth] is_admin_or_superuser failed: $e');
      state = state.copyWith(isAdmin: false);
    }
  }

  /// Request a magic-link email.
  ///
  /// - Anonymous user → `updateUser({email})` attaches an email identity to
  ///   the existing anon user. Supabase preserves the UUID so all prior anon
  ///   data (favorites, plays, history) carries over automatically.
  /// - Otherwise → plain `signInWithOtp`.
  Future<({Object? error})> signInWithMagicLink(String email) async {
    try {
      if (state.isAnonymous) {
        try {
          await _client.auth.updateUser(UserAttributes(email: email));
          return (error: null);
        } catch (e) {
          // If the email is already bound to another auth.users row (common
          // for admins who pre-existed this flow), fall back to a plain
          // magic-link so the user can sign into THAT existing account.
          if (_isEmailAlreadyInUse(e)) {
            await _sendPlainMagicLink(email);
            return (error: null);
          }
          rethrow;
        }
      }
      await _sendPlainMagicLink(email);
      return (error: null);
    } catch (e) {
      return (error: e);
    }
  }

  Future<void> _sendPlainMagicLink(String email) {
    return _client.auth.signInWithOtp(
      email: email,
      emailRedirectTo: 'sd.aelsir.ranna://auth/callback',
    );
  }

  bool _isEmailAlreadyInUse(Object error) {
    final msg = error.toString().toLowerCase();
    return msg.contains('already been registered') ||
        msg.contains('already registered') ||
        msg.contains('already exists') ||
        msg.contains('email address is already') ||
        msg.contains('user already registered') ||
        msg.contains('email_exists');
  }

  /// Sign out and immediately bootstrap a fresh anonymous session. Users are
  /// never in a null-session state — all user_id-dependent writes keep working.
  Future<void> signOut() async {
    try {
      await _client.auth.signOut();
    } catch (e) {
      debugPrint('[auth] signOut failed: $e');
    }
    _bootstrapped = false;
    state = state.copyWith(
      clearSession: true,
      clearUser: true,
      isAnonymous: true,
      isAdmin: false,
      loading: true,
    );
    await _bootstrapAnonymous();
  }

  @override
  void dispose() {
    _authSub?.cancel();
    super.dispose();
  }
}

final authNotifierProvider =
    StateNotifierProvider<AuthNotifier, AuthState>((ref) => AuthNotifier());
