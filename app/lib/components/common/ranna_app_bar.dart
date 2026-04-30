import 'package:flutter/material.dart';
import 'package:ranna/components/common/circle_back_button.dart';
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
      title: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8.0),
        child: Text(title),
      ),
      titleTextStyle: const TextStyle(
        fontFamily: RannaTheme.fontKufam,
        fontSize: 18,
        fontWeight: FontWeight.bold,
        color: RannaTheme.foreground,
      ),
      centerTitle: false,
      backgroundColor: RannaTheme.background,
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
      // App-bar back button falls back to home (`/`) instead of the
      // default `/account` since this bar is used by browse / list pages
      // outside the زاويتي tab.
      leading: const Padding(
        padding: EdgeInsets.all(8.0),
        child: CircleBackButton(fallbackPath: '/'),
      ),
    );
  }

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight + 1.0);
}
