import 'package:flutter/material.dart';

import 'package:ranna/theme/app_theme.dart';

/// Section header row with a bold title and an optional "see all" pill button.
///
/// Used at the top of horizontal scroll sections on the home screen.
class SectionHeader extends StatelessWidget {
  final String title;
  final VoidCallback? onSeeAll;

  const SectionHeader({
    super.key,
    required this.title,
    this.onSeeAll,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsetsDirectional.fromSTEB(20, 20, 20, 10),
      child: Row(
        children: [
          Text(
            title,
            style: const TextStyle(
              fontFamily: RannaTheme.fontFustat,
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: RannaTheme.foreground,
            ),
          ),
          const Spacer(),
          if (onSeeAll != null)
            GestureDetector(
              onTap: onSeeAll,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: RannaTheme.secondary,
                  borderRadius: BorderRadius.circular(RannaTheme.radiusFull),
                  boxShadow: [
                    BoxShadow(
                      color: RannaTheme.secondary.withValues(alpha: 0.2),
                      blurRadius: 12,
                      offset: const Offset(0, 2),
                      spreadRadius: -2,
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.chevron_left,
                      size: 14,
                      color: RannaTheme.secondaryForeground,
                    ),
                    const SizedBox(width: 2),
                    Text(
                      'عرض الكل',
                      style: TextStyle(
                        fontFamily: RannaTheme.fontFustat,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: RannaTheme.secondaryForeground,
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
