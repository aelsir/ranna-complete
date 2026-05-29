import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:supabase_flutter/supabase_flutter.dart' hide AuthState;

import 'package:ranna/providers/auth_notifier.dart';
import 'package:ranna/services/last_auth_method.dart';
import 'package:ranna/services/mixpanel_service.dart';
import 'package:ranna/theme/app_theme.dart';

/// Route target for magic-link deep links (`sd.aelsir.ranna://auth/callback`
/// and `https://ranna.aelsir.sd/auth/callback`).
///
/// `supabase_flutter` auto-intercepts the incoming URL and completes the
/// session exchange via `PKCE`. We only need to wait for the notifier to
/// see a non-anonymous session and then navigate home.
class AuthCallbackScreen extends ConsumerStatefulWidget {
  const AuthCallbackScreen({super.key});

  @override
  ConsumerState<AuthCallbackScreen> createState() => _AuthCallbackScreenState();
}

class _AuthCallbackScreenState extends ConsumerState<AuthCallbackScreen> {
  Timer? _timeoutTimer;
  bool _timedOut = false;
  bool _profileSynced = false;

  /// Copy profile fields from `raw_user_meta_data` into `user_profiles`
  /// right after the session upgrades. Non-blocking: user is already
  /// authenticated, this is best-effort sync.
  ///
  /// Reads:
  ///   - `display_name` — set by magic-link signup + our Apple flow
  ///   - `full_name` — set by Google + sometimes Apple (`given_name`+`family_name`)
  ///   - `name` — fallback used by some Google projects
  ///   - `avatar_url` / `picture` — Google profile image (Apple does not provide one)
  ///   - `country` — set by magic-link signup form
  ///
  /// `display_name` falls back to `full_name`/`name` for OAuth signups so the
  /// account screen always has something to render. Phone stays in metadata
  /// only — no column for it.
  Future<void> _syncProfileFromMetadata(User user) async {
    if (_profileSynced) return;
    _profileSynced = true;
    try {
      final meta = user.userMetadata ?? const {};
      final update = <String, dynamic>{'id': user.id};

      final explicitName = (meta['display_name'] as String?)?.trim();
      final fullName = (meta['full_name'] as String?)?.trim();
      final fallbackName = (meta['name'] as String?)?.trim();
      final resolvedName = (explicitName != null && explicitName.isNotEmpty)
          ? explicitName
          : (fullName != null && fullName.isNotEmpty)
              ? fullName
              : (fallbackName ?? '');
      if (resolvedName.isNotEmpty) update['display_name'] = resolvedName;

      final avatar = (meta['avatar_url'] as String?)?.trim() ??
          (meta['picture'] as String?)?.trim() ??
          '';
      if (avatar.isNotEmpty) update['avatar_url'] = avatar;

      final country = (meta['country'] as String?)?.trim();
      if (country != null && country.isNotEmpty) update['country'] = country;

      // Only upsert if there's something to sync beyond the id.
      if (update.length <= 1) return;
      await Supabase.instance.client
          .from('user_profiles')
          .upsert(update, onConflict: 'id');
    } catch (e) {
      debugPrint('[auth_callback] profile sync failed: $e');
    }
  }

  /// Infer the sign-up method from the user's identities. The first identity
  /// is the one that originally created the auth.users row (later linked
  /// identities don't override it). Falls back to `magic_link` for the
  /// classic email flow when we don't see an OAuth provider.
  String _resolveSignUpMethod(User user) {
    final identities = user.identities ?? const [];
    for (final identity in identities) {
      final provider = identity.provider.toLowerCase();
      if (provider == 'google') return 'google';
      if (provider == 'apple') return 'apple';
    }
    return 'magic_link';
  }

  LastAuthMethod _toLastAuthMethod(String method) {
    switch (method) {
      case 'google':
        return LastAuthMethod.google;
      case 'apple':
        return LastAuthMethod.apple;
      default:
        return LastAuthMethod.email;
    }
  }

  @override
  void initState() {
    super.initState();
    // Fallback: if the session doesn't upgrade within 5 s, let the user go back.
    _timeoutTimer = Timer(const Duration(seconds: 5), () {
      if (mounted) setState(() => _timedOut = true);
    });
  }

  @override
  void dispose() {
    _timeoutTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // React to auth state — once we have a non-anonymous session, sync
    // profile metadata then navigate.
    ref.listen<AuthState>(authNotifierProvider, (prev, next) {
      final user = next.user;
      if (user != null && !next.isAnonymous && mounted) {
        // Fire-and-forget: navigation doesn't wait for the upsert so a
        // slow/failed DB write never blocks the user.
        unawaited(_syncProfileFromMetadata(user));

        final method = _resolveSignUpMethod(user);

        // Remember the method for next time so the login screen can lift
        // this provider's button to the top + show a "آخر مرة" hint.
        unawaited(LastAuthMethodStore.set(_toLastAuthMethod(method)));

        // ── Mixpanel: sign_up_completed ──────────────────────────────
        if (MixpanelService.isInitialized) {
          final meta = user.userMetadata ?? const {};
          MixpanelService.instance.track('sign_up_completed', properties: {
            'sign_up_method': method,
            'platform': MixpanelService.currentPlatform,
            'country': (meta['country'] as String?) ?? '',
          });
        }

        context.go('/account');
      }
    });

    if (_timedOut) {
      return Directionality(
        textDirection: TextDirection.rtl,
        child: Scaffold(
          backgroundColor: RannaTheme.background,
          body: Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: RannaTheme.destructive.withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.error_outline_rounded,
                      size: 32,
                      color: RannaTheme.destructive,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'لم نتمكن من إكمال الدخول',
                    style: TextStyle(
                      fontFamily: RannaTheme.fontFustat,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: RannaTheme.foreground,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'ربما انتهت صلاحية الرابط أو فُتح في تطبيق مختلف.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontFamily: RannaTheme.fontFustat,
                      fontSize: 12,
                      color: RannaTheme.mutedForeground,
                    ),
                  ),
                  const SizedBox(height: 24),
                  FilledButton(
                    style: FilledButton.styleFrom(
                      backgroundColor: RannaTheme.primary,
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(RannaTheme.radiusLg),
                      ),
                    ),
                    onPressed: () => context.go('/account'),
                    child: Text(
                      'العودة',
                      style: TextStyle(
                        fontFamily: RannaTheme.fontFustat,
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: RannaTheme.primaryForeground,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: RannaTheme.background,
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const CircularProgressIndicator(color: RannaTheme.primary),
              const SizedBox(height: 16),
              Text(
                'جاري تسجيل الدخول…',
                style: TextStyle(
                  fontFamily: RannaTheme.fontFustat,
                  fontSize: 14,
                  color: RannaTheme.mutedForeground,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
