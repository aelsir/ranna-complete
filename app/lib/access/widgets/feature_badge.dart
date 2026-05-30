import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../theme/app_theme.dart';
import '../access_provider.dart';
import '../feature.dart';
import 'package:flutter_svg/flutter_svg.dart';
/// glyph for paid ones) drawn over a gated control's icon.
///
/// Renders nothing when the current user already has access, so you can drop
/// it unconditionally next to any gated icon:
///
/// ```dart
/// Stack(
///   clipBehavior: Clip.none,
///   children: [
///     Icon(Icons.download_rounded),
///     const PositionedDirectional(
///       top: -2, end: -2,
///       child: FeatureBadge(feature: Feature.downloadTrack),
///     ),
///   ],
/// )
/// ```
///
/// The color/glyph come from the feature's [Feature.requiredTier], so the day
/// `downloadTrack` becomes premium its badge automatically switches from the
/// gold lock to the premium color — no change here.
class FeatureBadge extends ConsumerWidget {
  final Feature feature;
  final double size;

  const FeatureBadge({super.key, required this.feature, this.size = 14});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (ref.watch(canAccessProvider(feature))) return const SizedBox.shrink();

    final tier = feature.requiredTier;
    final color = tier.badgeColor ?? RannaTheme.accent;

    return SvgPicture.asset(
      'assets/icons/signing-badge.svg',
      width: size,
      height: size,
    );
  }
}
