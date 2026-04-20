import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:ranna/providers/auth_notifier.dart';
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
    // React to auth state — once we have a non-anonymous session, navigate.
    ref.listen<AuthState>(authNotifierProvider, (prev, next) {
      if (next.user != null && !next.isAnonymous && mounted) {
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
