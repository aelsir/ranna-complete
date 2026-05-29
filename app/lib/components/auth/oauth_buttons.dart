import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:ranna/services/last_auth_method.dart';
import 'package:ranna/theme/app_theme.dart';

/// Shared OAuth sign-in buttons (Google + Apple) with platform-aware ordering
/// and a "آخر مرة دخلت بهذا" hint above the most recently used provider.
///
/// Ordering rules:
///   1. If [lastMethod] is google or apple, that button always renders first
///      and gets the "last used" badge.
///   2. Otherwise: iOS/macOS → Apple first, everything else → Google first.
///
/// The widget also exposes a matching [OAuthDivider] for the "or sign in
/// with email" separator below.
class OAuthButtons extends StatelessWidget {
  final VoidCallback? onGoogleTap;
  final VoidCallback? onAppleTap;
  final bool googleLoading;
  final bool appleLoading;

  /// Render with signup-flavored Arabic copy ("التسجيل") instead of login
  /// ("الدخول").
  final bool isSignUp;

  /// Which provider the user most recently signed in with. When set to
  /// google/apple, that button floats to the top and shows the hint badge.
  /// `email` and null both fall back to platform-based ordering with no
  /// badge.
  final LastAuthMethod? lastMethod;

  const OAuthButtons({
    super.key,
    this.onGoogleTap,
    this.onAppleTap,
    this.googleLoading = false,
    this.appleLoading = false,
    this.isSignUp = false,
    this.lastMethod,
  });

  @override
  Widget build(BuildContext context) {
    final platform = Theme.of(context).platform;
    final isApple =
        platform == TargetPlatform.iOS || platform == TargetPlatform.macOS;

    final googleButton = _OAuthButton(
      icon: SvgPicture.asset(
        'assets/icons/google-logo.svg',
        width: 18,
        height: 18,
      ),
      label: isSignUp ? 'التسجيل بحساب قوقل' : 'الدخول بحساب قوقل',
      loading: googleLoading,
      onTap: onGoogleTap,
    );

    final appleButton = _OAuthButton(
      // The bundled Apple logo SVG has a hard-coded black fill — recolor it
      // to the theme foreground so the icon stays legible in both light and
      // dark mode.
      icon: SvgPicture.asset(
        'assets/icons/apple-logo.svg',
        width: 18,
        height: 18,
        colorFilter: const ColorFilter.mode(
          RannaTheme.foreground,
          BlendMode.srcIn,
        ),
      ),
      label: isSignUp ? 'التسجيل بحساب أبل' : 'الدخول بحساب أبل',
      loading: appleLoading,
      onTap: onAppleTap,
    );

    // ── Decide order ───────────────────────────────────────────────────
    final orderedButtons = <Widget>[];
    if (lastMethod == LastAuthMethod.google) {
      orderedButtons
        ..add(_withLastHint(googleButton))
        ..add(const SizedBox(height: 10))
        ..add(appleButton);
    } else if (lastMethod == LastAuthMethod.apple) {
      orderedButtons
        ..add(_withLastHint(appleButton))
        ..add(const SizedBox(height: 10))
        ..add(googleButton);
    } else if (isApple) {
      orderedButtons
        ..add(appleButton)
        ..add(const SizedBox(height: 10))
        ..add(googleButton);
    } else {
      orderedButtons
        ..add(googleButton)
        ..add(const SizedBox(height: 10))
        ..add(appleButton);
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: orderedButtons,
    );
  }

  /// Wrap [button] with a small "آخر مرة دخلت بهذا" badge above it.
  Widget _withLastHint(Widget button) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.only(bottom: 6, right: 4),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.history_rounded,
                size: 12,
                color: RannaTheme.primary,
              ),
              const SizedBox(width: 4),
              Text(
                'آخر مرة دخلت بهذا',
                style: TextStyle(
                  fontFamily: RannaTheme.fontFustat,
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: RannaTheme.primary,
                ),
              ),
            ],
          ),
        ),
        button,
      ],
    );
  }
}

/// The "or sign in with email" divider line.
class OAuthDivider extends StatelessWidget {
  final bool isSignUp;
  const OAuthDivider({super.key, this.isSignUp = false});

  @override
  Widget build(BuildContext context) {
    final label =
        isSignUp ? 'أو سجّل ببريدك الإلكتروني' : 'أو ادخل ببريدك الإلكتروني';
    return Row(
      children: [
        Expanded(
          child: Divider(
            color: RannaTheme.border.withValues(alpha: 0.6),
            height: 1,
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14),
          child: Text(
            label,
            style: TextStyle(
              fontFamily: RannaTheme.fontFustat,
              fontSize: 11,
              color: RannaTheme.mutedForeground,
            ),
          ),
        ),
        Expanded(
          child: Divider(
            color: RannaTheme.border.withValues(alpha: 0.6),
            height: 1,
          ),
        ),
      ],
    );
  }
}

// =============================================================================
// Internal widgets
// =============================================================================

class _OAuthButton extends StatelessWidget {
  final Widget icon;
  final String label;
  final bool loading;
  final VoidCallback? onTap;

  const _OAuthButton({
    required this.icon,
    required this.label,
    this.loading = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: RannaTheme.card,
        borderRadius: BorderRadius.circular(RannaTheme.radiusLg),
        border: Border.all(color: RannaTheme.border),
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(RannaTheme.radiusLg),
        child: InkWell(
          borderRadius: BorderRadius.circular(RannaTheme.radiusLg),
          onTap: loading ? null : onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 14),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (loading)
                  SizedBox(
                    height: 18,
                    width: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: RannaTheme.mutedForeground,
                    ),
                  )
                else
                  icon,
                const SizedBox(width: 10),
                Text(
                  label,
                  style: TextStyle(
                    fontFamily: RannaTheme.fontFustat,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: RannaTheme.foreground,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
