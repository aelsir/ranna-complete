import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:ranna/theme/app_theme.dart';

class RannaAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String title;

  const RannaAppBar({
    super.key,
    required this.title,
  });

  @override
  Widget build(BuildContext context) {
    return AppBar(
      title: Text(title),
      titleTextStyle: const TextStyle(
        fontFamily: RannaTheme.fontFustat,
        fontSize: 18,
        fontWeight: FontWeight.bold,
        color: RannaTheme.primary,
      ),
      centerTitle: false,
      titleSpacing: 0, // Reduces the gap between the title and the back button
      backgroundColor: Colors.white,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 0,
      bottom: PreferredSize(
        preferredSize: const Size.fromHeight(1.0),
        child: Container(
          color: RannaTheme.border.withValues(alpha: 0.3),
          height: 1.0,
        ),
      ),
      leading: Padding(
        padding: const EdgeInsets.all(8.0),
        child: GestureDetector(
          onTap: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/');
            }
          },
          child: Container(
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
        ),
      ),
    );
  }

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight + 1.0);
}
