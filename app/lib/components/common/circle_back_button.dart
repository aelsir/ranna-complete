import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'package:ranna/theme/app_theme.dart';

/// Circular back button used by detail screens that don't sit on a
/// `SliverAppBar` (e.g. `سجل الاستماع`, `إحصائيات الاستماع`, `بيانات الحساب`,
/// `متابعاتي`) and by the shared `RannaAppBar`.
///
/// Behavior:
/// * If the navigator can pop, pops.
/// * Otherwise (cold-start deep link with no history) navigates to
///   [fallbackPath] — defaults to `/account` since most callers live under
///   the زاويتي tab. The shared app bar passes `/` to land at home instead.
///
/// In RTL the right-pointing chevron visually means "back" — toward the
/// reading-direction start.
class CircleBackButton extends StatelessWidget {
  /// Where to go when there's nothing to pop. Most screens want `/account`.
  final String fallbackPath;

  /// Diameter of the circle. The icon scales independently inside (24dp)
  /// so a larger size leaves more padding around the chevron.
  final double size;

  const CircleBackButton({
    super.key,
    this.fallbackPath = '/account',
    this.size = 36,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        if (context.canPop()) {
          context.pop();
        } else {
          context.go(fallbackPath);
        }
      },
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: RannaTheme.muted.withValues(alpha: 0.8),
        ),
        child: const Icon(
          Icons.keyboard_arrow_right_rounded,
          size: 24,
          color: RannaTheme.foreground,
        ),
      ),
    );
  }
}
