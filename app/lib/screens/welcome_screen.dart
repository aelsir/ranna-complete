import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:ranna/access/access_tier.dart';
import 'package:ranna/providers/auth_notifier.dart';
import 'package:ranna/theme/app_theme.dart';

/// Post-sign-in welcome screen — the warm landing after a successful
/// sign-up / sign-in (route `/welcome`).
///
/// Mirrors the access gate sheet's layout (banner fading into black, Kufam
/// title, benefit rows, pinned pink CTA) but flips its meaning: the gold
/// locks become emerald checkmarks, because everything the gate promised is
/// now unlocked. Shown by:
///   • AuthScreen — when the auth state turns non-anonymous (OAuth, or an
///     existing account logging in).
///   • AuthCallbackScreen — after a magic link lands.
class WelcomeScreen extends ConsumerWidget {
  const WelcomeScreen({super.key});

  static const String _bannerAsset = 'assets/images/gate-sheet-banner.jpg';
  static const double _bannerHeight = 280;

  void _continue(BuildContext context) {
    HapticFeedback.selectionClick();
    context.go('/');
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final topPadding = MediaQuery.of(context).padding.top;
    final bottomPadding = MediaQuery.of(context).padding.bottom;

    // Personalize when we know who they are. Magic-link signups store
    // display_name; Google/Apple provide full_name / name.
    final meta = ref.watch(authNotifierProvider).user?.userMetadata;
    final name = [
      meta?['display_name'],
      meta?['full_name'],
      meta?['name'],
    ].whereType<String>().map((s) => s.trim()).where((s) => s.isNotEmpty)
        .firstOrNull;

    const benefits = AccessTier.member;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: RannaTheme.background,
        body: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // ── Banner image fading into the black background ──
              SizedBox(
                height: _bannerHeight + topPadding,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    Positioned.fill(
                      child: Image.asset(
                        _bannerAsset,
                        fit: BoxFit.cover,
                        alignment: Alignment.topCenter,
                        errorBuilder: (_, _, _) =>
                            const ColoredBox(color: RannaTheme.surface1),
                      ),
                    ),
                    Positioned(
                      left: 0,
                      right: 0,
                      bottom: 0,
                      height: _bannerHeight * 0.55,
                      child: Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              RannaTheme.background.withValues(alpha: 0),
                              RannaTheme.background.withValues(alpha: 0.7),
                              RannaTheme.background,
                            ],
                            stops: const [0.0, 0.6, 1.0],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const SizedBox(height: 20),
                    Text(
                      name == null ? 'أهلاً بك في رنّة' : 'أهلاً بك، $name',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontFamily: RannaTheme.fontKufam,
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: RannaTheme.foreground,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'تم تسجيل دخولك بنجاح — كل مزايا الأعضاء أصبحت بين يديك',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontFamily: RannaTheme.fontKufam,
                        fontSize: 14,
                        fontWeight: FontWeight.w300,
                        color: RannaTheme.mutedForeground,
                        height: 1.6,
                      ),
                    ),
                    const SizedBox(height: 32),

                    // ── Unlocked benefits — gate rows, emerald checks ──
                    for (final b in benefits.benefits)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        child: Row(
                          children: [
                            Container(
                              width: 42,
                              height: 42,
                              decoration: BoxDecoration(
                                color: RannaTheme.primary.withValues(
                                  alpha: 0.12,
                                ),
                                borderRadius: BorderRadius.circular(
                                  RannaTheme.radiusMd,
                                ),
                              ),
                              child: Icon(
                                b.icon,
                                size: 20,
                                color: RannaTheme.primary,
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Text(
                                b.label,
                                style: const TextStyle(
                                  fontFamily: RannaTheme.fontKufam,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w300,
                                  height: 1.5,
                                  color: RannaTheme.foreground,
                                ),
                              ),
                            ),
                            const Icon(
                              Icons.check_circle_rounded,
                              size: 20,
                              color: RannaTheme.primary,
                            ),
                          ],
                        ),
                      ),

                    SizedBox(height: bottomPadding + 90),
                  ],
                ),
              ),
            ],
          ),
        ),
        bottomNavigationBar: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 8, 24, 16),
            child: SizedBox(
              height: 54,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: RannaTheme.tertiary,
                  foregroundColor: RannaTheme.tertiaryForeground,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(RannaTheme.radiusFull),
                  ),
                  elevation: 0,
                ),
                onPressed: () => _continue(context),
                child: const Text(
                  'ابدأ الاستماع',
                  style: TextStyle(
                    fontFamily: RannaTheme.fontKufam,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
