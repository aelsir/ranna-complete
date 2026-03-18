/// Ranna design system — matching the ranna-v2 webapp brand exactly.
library;

import 'dart:ui';
import 'package:flutter/material.dart';

class RannaTheme {
  RannaTheme._();

  // ===========================================================================
  // Brand Colors
  // ===========================================================================

  /// primary: 184 43% 19% — dark teal
  static const Color primary = Color(0xFF1B4144);
  static const Color primaryForeground = Color(0xFFFFFFFF);
  static const Color primaryGlow = Color(0xFF245E5C);

  /// secondary: 73 100% 50% — lime green
  static const Color secondary = Color(0xFFBEFF00);
  static const Color secondaryForeground = Color(0xFF112B2C);

  /// accent: 7 100% 70% — coral
  static const Color accent = Color(0xFFFF6B66);
  static const Color accentForeground = Color(0xFFFFFFFF);

  /// background: 160 10% 97%
  static const Color background = Color(0xFFF5F7F5);
  /// foreground: 184 43% 15%
  static const Color foreground = Color(0xFF162F31);
  /// card: pure white
  static const Color card = Color(0xFFFFFFFF);
  /// muted: 180 12% 93%
  static const Color muted = Color(0xFFE8EDED);
  /// muted-foreground: 184 20% 46%
  static const Color mutedForeground = Color(0xFF5E8385);
  /// border: 180 12% 88%
  static const Color border = Color(0xFFD9E1E1);
  static const Color input = Color(0xFFE0E8E8);
  static const Color destructive = Color(0xFFEF4444);

  // ===========================================================================
  // Shadows
  // ===========================================================================

  static List<BoxShadow> get shadowSm => [
        BoxShadow(color: primary.withValues(alpha: 0.04), blurRadius: 3, offset: const Offset(0, 1)),
      ];

  static List<BoxShadow> get shadowMd => [
        BoxShadow(color: primary.withValues(alpha: 0.08), blurRadius: 16, offset: const Offset(0, 4)),
      ];

  static List<BoxShadow> get shadowLg => [
        BoxShadow(color: primary.withValues(alpha: 0.12), blurRadius: 40, offset: const Offset(0, 12)),
      ];

  static List<BoxShadow> get shadowCard => [
        BoxShadow(color: primary.withValues(alpha: 0.06), blurRadius: 20, offset: const Offset(0, 4)),
      ];

  static List<BoxShadow> get shadowFloat => shadowLg;

  static List<BoxShadow> get shadowGlowSecondary => [
        BoxShadow(color: secondary.withValues(alpha: 0.35), blurRadius: 24, offset: const Offset(0, 4), spreadRadius: -4),
      ];

  static List<BoxShadow> get shadowGlowAccent => [
        BoxShadow(color: accent.withValues(alpha: 0.3), blurRadius: 20, offset: const Offset(0, 4), spreadRadius: -4),
      ];

  // ===========================================================================
  // Border Radius
  // ===========================================================================

  static const double radiusSm = 8;
  static const double radiusMd = 12;
  static const double radiusLg = 16;
  static const double radiusXl = 20;
  static const double radius2xl = 24;
  static const double radius3xl = 28;
  static const double radiusFull = 999;

  // ===========================================================================
  // Glassmorphism
  // ===========================================================================

  static Widget glassContainer({
    required Widget child,
    double sigmaX = 20,
    double sigmaY = 20,
    Color? color,
    BorderRadius? borderRadius,
    EdgeInsets? padding,
    Border? border,
    List<BoxShadow>? boxShadow,
  }) {
    return ClipRRect(
      borderRadius: borderRadius ?? BorderRadius.zero,
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: sigmaX, sigmaY: sigmaY),
        child: Container(
          decoration: BoxDecoration(
            color: color ?? Colors.white.withValues(alpha: 0.72),
            borderRadius: borderRadius,
            border: border,
            boxShadow: boxShadow,
          ),
          padding: padding,
          child: child,
        ),
      ),
    );
  }

  // ===========================================================================
  // Typography
  // ===========================================================================

  /// Font family constants for use across the app.
  static const String fontFustat = 'Fustat';
  static const String fontNotoNaskh = 'NotoNaskhArabic';

  static TextTheme _buildTextTheme() {
    return const TextTheme(
      // Display — Fustat for large decorative headings
      displayLarge: TextStyle(fontFamily: fontFustat, color: foreground),
      displayMedium: TextStyle(fontFamily: fontFustat, color: foreground),
      displaySmall: TextStyle(fontFamily: fontFustat, color: foreground),

      // Headline — Fustat bold/extrabold for section titles
      headlineLarge: TextStyle(fontFamily: fontFustat, color: foreground, fontWeight: FontWeight.w800),
      headlineMedium: TextStyle(fontFamily: fontFustat, color: foreground, fontWeight: FontWeight.w700),
      headlineSmall: TextStyle(fontFamily: fontFustat, color: foreground, fontWeight: FontWeight.bold),

      // Title — Fustat bold for card titles, app bar
      titleLarge: TextStyle(fontFamily: fontFustat, color: foreground, fontWeight: FontWeight.bold, fontSize: 20),
      titleMedium: TextStyle(fontFamily: fontFustat, color: foreground, fontWeight: FontWeight.bold),
      titleSmall: TextStyle(fontFamily: fontFustat, color: foreground, fontWeight: FontWeight.w600),

      // Body — Noto Naskh Arabic for readable Arabic prose
      bodyLarge: TextStyle(fontFamily: fontNotoNaskh, color: foreground),
      bodyMedium: TextStyle(fontFamily: fontNotoNaskh, color: foreground),
      bodySmall: TextStyle(fontFamily: fontNotoNaskh, color: mutedForeground),

      // Label — Fustat bold for buttons, chips, nav labels
      labelLarge: TextStyle(fontFamily: fontFustat, color: foreground, fontWeight: FontWeight.bold),
      labelMedium: TextStyle(fontFamily: fontFustat, color: mutedForeground, fontWeight: FontWeight.bold),
      labelSmall: TextStyle(fontFamily: fontFustat, color: mutedForeground, fontWeight: FontWeight.bold),
    );
  }

  // ===========================================================================
  // Color scheme
  // ===========================================================================

  static const ColorScheme colorScheme = ColorScheme(
    brightness: Brightness.light,
    primary: primary,
    onPrimary: primaryForeground,
    primaryContainer: Color(0xFFD0F0EE),
    onPrimaryContainer: foreground,
    secondary: secondary,
    onSecondary: secondaryForeground,
    secondaryContainer: Color(0xFFE8FFB3),
    onSecondaryContainer: secondaryForeground,
    tertiary: accent,
    onTertiary: accentForeground,
    tertiaryContainer: Color(0xFFFFDAD5),
    onTertiaryContainer: Color(0xFF410002),
    error: destructive,
    onError: Color(0xFFFFFFFF),
    surface: card,
    onSurface: foreground,
    onSurfaceVariant: mutedForeground,
    outline: border,
    outlineVariant: muted,
    shadow: Color(0xFF000000),
    scrim: Color(0xFF000000),
    inverseSurface: foreground,
    onInverseSurface: Color(0xFFF5F5F5),
    inversePrimary: Color(0xFF80CBC4),
    surfaceContainerHighest: muted,
  );

  // ===========================================================================
  // ThemeData
  // ===========================================================================

  static final ThemeData lightTheme = _buildLightTheme();

  static ThemeData _buildLightTheme() {
    final textTheme = _buildTextTheme();

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: background,
      textTheme: textTheme,
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.transparent,
        foregroundColor: foreground,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold, color: foreground),
        iconTheme: const IconThemeData(color: foreground),
      ),
      cardTheme: CardThemeData(
        color: card,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusLg),
          side: BorderSide(color: border.withValues(alpha: 0.2)),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: Colors.transparent,
        indicatorColor: Colors.transparent,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return textTheme.labelSmall?.copyWith(color: foreground, fontWeight: FontWeight.bold, fontSize: 10);
          }
          return textTheme.labelSmall?.copyWith(color: mutedForeground, fontSize: 10);
        }),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: secondary,
          foregroundColor: secondaryForeground,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(radiusFull)),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          elevation: 0,
          textStyle: textTheme.labelLarge?.copyWith(fontWeight: FontWeight.bold),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(foregroundColor: primary, textStyle: textTheme.labelLarge),
      ),
      iconButtonTheme: IconButtonThemeData(style: IconButton.styleFrom(foregroundColor: foreground)),
      iconTheme: const IconThemeData(color: foreground, size: 24),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: muted,
        hintStyle: textTheme.bodyMedium?.copyWith(color: mutedForeground),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radius2xl),
          borderSide: BorderSide(color: border.withValues(alpha: 0.2)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radius2xl),
          borderSide: BorderSide(color: border.withValues(alpha: 0.2)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radius2xl),
          borderSide: BorderSide(color: primary.withValues(alpha: 0.2), width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
      sliderTheme: SliderThemeData(
        activeTrackColor: accent,
        inactiveTrackColor: primaryForeground.withValues(alpha: 0.15),
        thumbColor: accent,
        overlayColor: accent.withValues(alpha: 0.15),
        trackHeight: 4,
        thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 7),
      ),
      dividerTheme: DividerThemeData(color: border.withValues(alpha: 0.3), thickness: 1, space: 0),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: foreground,
        contentTextStyle: textTheme.bodyMedium?.copyWith(color: Colors.white),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(radiusMd)),
        behavior: SnackBarBehavior.floating,
      ),
      progressIndicatorTheme: const ProgressIndicatorThemeData(color: accent, linearTrackColor: muted),
    );
  }
}
