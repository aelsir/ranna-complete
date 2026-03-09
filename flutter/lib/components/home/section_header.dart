import 'package:flutter/material.dart';

import 'package:ranna/theme/app_theme.dart';

/// Section header row with a bold title and an optional "see all" action button.
///
/// Used at the top of horizontal scroll sections on the home screen
/// (e.g. "المداح", "المجموعات").
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
      padding: const EdgeInsetsDirectional.fromSTEB(16, 16, 16, 8),
      child: Row(
        children: [
          Text(
            title,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: RannaTheme.foreground,
                ),
          ),
          const Spacer(),
          if (onSeeAll != null)
            TextButton(
              onPressed: onSeeAll,
              style: TextButton.styleFrom(
                foregroundColor: RannaTheme.accent,
              ),
              child: const Text('عرض الكل'),
            ),
        ],
      ),
    );
  }
}
