import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:go_router/go_router.dart';

import '../../theme/app_theme.dart';
import '../access_tier.dart';
import '../feature.dart';

/// Full-screen access gate shown when a user below a feature's required tier
/// taps it.
///
/// Layout (top → bottom, inspired by the Thmanyah subscription gate):
///  1. Banner image — fades into the black background with a gradient overlay.
///  2. Badge / logo — sits at the transition between banner and content.
///  3. Title + subtitle (light-weight ReadexPro font).
///  4. Benefit rows with icons.
///  5. Primary CTA button.
///  6. A circular ✕ close button in the top-right corner (RTL: top-left
///     visual) replaces the old "ليس الآن" dismiss option.
///
/// The SAME component serves the future premium paywall — it renders whatever
/// the target [AccessTier] declares (title / subtitle / benefits / CTA label).
/// Today the only target tier is [AccessTier.member], whose CTA routes to
/// `/auth`.
///
/// Returns nothing; the CTA either navigates to sign-in (member) or — once
/// subscriptions exist — to the paywall (premium).
Future<void> showAccessGateSheet(
  BuildContext context,
  WidgetRef ref,
  Feature feature,
) {
  HapticFeedback.lightImpact();
  final tier = feature.requiredTier;

  return Navigator.of(context).push<void>(
    PageRouteBuilder<void>(
      opaque: true,
      barrierDismissible: false,
      pageBuilder: (context, animation, secondaryAnimation) =>
          _AccessGateScreen(tier: tier),
      transitionsBuilder: (context, animation, secondaryAnimation, child) {
        return FadeTransition(
          opacity: CurvedAnimation(parent: animation, curve: Curves.easeOut),
          child: SlideTransition(
            position: Tween<Offset>(
              begin: const Offset(0, 0.05),
              end: Offset.zero,
            ).animate(CurvedAnimation(
              parent: animation,
              curve: Curves.easeOutCubic,
            )),
            child: child,
          ),
        );
      },
      transitionDuration: const Duration(milliseconds: 350),
      reverseTransitionDuration: const Duration(milliseconds: 250),
    ),
  );
}

// =============================================================================
// Full-screen gate
// =============================================================================

class _AccessGateScreen extends StatelessWidget {
  final AccessTier tier;
  const _AccessGateScreen({required this.tier});

  /// Banner image asset path.
  static const String _bannerAsset = 'assets/images/gate-sheet-banner.jpg';

  /// Height of the banner image area (before gradient fade).
  static const double _bannerHeight = 280;

  void _onCta(BuildContext context) {
    HapticFeedback.selectionClick();
    Navigator.of(context).pop();
    // Member gate → sign-in screen. When premium ships, branch here to the
    // paywall route instead (the tier already carries premium copy).
    context.push('/auth');
  }

  @override
  Widget build(BuildContext context) {
    final topPadding = MediaQuery.of(context).padding.top;
    final bottomPadding = MediaQuery.of(context).padding.bottom;
    final accent = tier.badgeColor ?? RannaTheme.accent;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: RannaTheme.background,
        body: Stack(
          children: [
            // ── Scrollable content ──
            SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // ── Banner image with gradient fade ──
                  _BannerImage(
                    topPadding: topPadding,
                    bannerHeight: _bannerHeight,
                    bannerAsset: _bannerAsset,
                  ),

                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const SizedBox(height: 20),

                        // ── Title ──
                        Text(
                          tier.gateTitle ?? 'سجِّل في رنّة',
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontFamily: RannaTheme.fontKufam,
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: RannaTheme.foreground,
                          ),
                        ),

                        if (tier.gateSubtitle != null) ...[
                          const SizedBox(height: 8),
                          Text(
                            tier.gateSubtitle!,
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              fontFamily: RannaTheme.fontKufam,
                              fontSize: 14,
                              fontWeight: FontWeight.w300,
                              color: RannaTheme.mutedForeground,
                              height: 1.6,
                            ),
                          ),
                        ],

                        const SizedBox(height: 32),

                        // ── Benefits ──
                        ...tier.benefits.map(
                          (b) => _BenefitRow(benefit: b, accent: accent),
                        ),

                        // Extra space so content doesn't hide behind
                        // the pinned CTA button at the bottom.
                        SizedBox(height: bottomPadding + 90),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // ── Close button (top-right in RTL → visually top-left) ──
            Positioned(
              top: topPadding + 12,
              right: 16,
              child: _CloseButton(
                onTap: () => Navigator.of(context).pop(),
              ),
            ),
          ],
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
                    borderRadius: BorderRadius.circular(
                      RannaTheme.radiusFull,
                    ),
                  ),
                  elevation: 0,
                ),
                onPressed: () => _onCta(context),
                child: Text(
                  tier.gateCtaLabel ?? 'سجِّل الآن',
                  style: const TextStyle(
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

// =============================================================================
// Banner image with gradient fade
// =============================================================================

class _BannerImage extends StatelessWidget {
  final double topPadding;
  final double bannerHeight;
  final String bannerAsset;

  const _BannerImage({
    required this.topPadding,
    required this.bannerHeight,
    required this.bannerAsset,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: bannerHeight + topPadding,
      child: Stack(
        fit: StackFit.expand,
        children: [
          // Image
          Positioned.fill(
            child: Image.asset(
              bannerAsset,
              fit: BoxFit.cover,
              alignment: Alignment.topCenter,
            ),
          ),
          // Bottom gradient fade into background
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            height: bannerHeight * 0.55,
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
    );
  }
}

// =============================================================================
// Close button — same circular style as CircleBackButton
// =============================================================================

class _CloseButton extends StatelessWidget {
  final VoidCallback onTap;
  const _CloseButton({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        onTap();
      },
      child: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: RannaTheme.muted.withValues(alpha: 0.8),
        ),
        child: const Icon(
          Icons.close_rounded,
          size: 22,
          color: RannaTheme.foreground,
        ),
      ),
    );
  }
}

// =============================================================================
// Benefit row
// =============================================================================

class _BenefitRow extends StatelessWidget {
  final AccessBenefit benefit;
  final Color accent;
  const _BenefitRow({required this.benefit, required this.accent});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: accent.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(RannaTheme.radiusMd),
            ),
            child: Icon(benefit.icon, size: 20, color: accent),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Text(
              benefit.label,
              style: const TextStyle(
                fontFamily: RannaTheme.fontKufam,
                fontSize: 14,
                fontWeight: FontWeight.w300,
                height: 1.5,
                color: RannaTheme.foreground,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
