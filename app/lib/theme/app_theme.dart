/// Ranna design system — AMOLED Black Dark Theme.
///
/// Pure-black scaffold (#000000) with elevated surfaces at #111111. Emerald
/// (#10B981) and gold (#FFD479) carry brand accents. Typography is Kufam
/// (display / headers / titles) + ReadexPro (body / subtitles / captions).
library;

import 'dart:ui';
import 'package:flutter/material.dart';

class RannaTheme {
  RannaTheme._();

  // ===========================================================================
  // Brand colors — AMOLED Dark
  // ===========================================================================

  /// Pure black scaffold — looks at home on OLED screens (pixels off = power
  /// off) and gives photography / artwork maximum contrast.
  static const Color background = Color(0xFF000000);

  /// Elevated surface for cards, dialogs, the mini player. Slightly lighter
  /// than the scaffold so cards still read as "above" the page without
  /// breaking the dark mood.
  static const Color card = Color(0xFF111111);

  /// Primary accent — emerald green. Used on filled buttons, follow chips,
  /// active states.
  static const Color primary = Color(0xFF10B981);
  static const Color primaryForeground = Color(0xFFFFFFFF);
  static const Color primaryGlow = Color(0xFF34D399);

  /// Legacy alias — maps to primary so any existing reference resolves.
  static const Color secondary = primary;
  static const Color secondaryForeground = Color(0xFF000000);

  /// Secondary accent — warm gold. Reserved for highlights, awards,
  /// special-occasion banners. Use sparingly so it stays meaningful.
  static const Color accent = Color(0xFFFFD479);

  /// Dark text on the gold accent — gold is a bright surface, needs dark fg.
  static const Color accentForeground = Color(0xFF111111);

  /// Primary text — white, against pure-black scaffold.
  static const Color foreground = Color(0xFFFFFFFF);

  /// Subtle surface (one step lighter than card) for resting states like
  /// chips, segmented controls, divider blocks.
  static const Color muted = Color(0xFF18181B);

  /// Muted text — Tailwind zinc-400. Captions, secondary labels.
  static const Color mutedForeground = Color(0xFF71717A);

  /// Hairline borders — Tailwind zinc-800. Visible against #111 cards but
  /// disappears against pure black where appropriate.
  static const Color border = Color(0xFF27272A);

  /// Form input fill — slightly lighter than card so inputs read as "wells".
  static const Color input = Color(0xFF1C1C1F);

  static const Color destructive = Color(0xFFEF4444);

  /// Bottom-nav specifics requested by the brief.
  static const Color navUnselected = Color(0xFF71717A);
  static const Color navSelected = Color(0xFFFFFFFF);
  static const Color navActiveIndicator = Color(0xFF3F3F46);

  // ===========================================================================
  // Shadows
  // ===========================================================================
  // On pure-black surfaces, drop-shadows are essentially invisible. We keep
  // the API but use very subtle white-glow shadows so floating elements
  // (mini player, bottom nav) still catch the eye.

  static List<BoxShadow> get shadowSm => [
    BoxShadow(
      color: Colors.white.withValues(alpha: 0.02),
      blurRadius: 3,
      offset: const Offset(0, 1),
    ),
  ];

  static List<BoxShadow> get shadowMd => [
    BoxShadow(
      color: Colors.white.withValues(alpha: 0.04),
      blurRadius: 16,
      offset: const Offset(0, 4),
    ),
  ];

  static List<BoxShadow> get shadowLg => [
    BoxShadow(
      color: Colors.black.withValues(alpha: 0.6),
      blurRadius: 40,
      offset: const Offset(0, 12),
    ),
  ];

  static List<BoxShadow> get shadowCard => [
    BoxShadow(
      color: Colors.black.withValues(alpha: 0.4),
      blurRadius: 20,
      offset: const Offset(0, 4),
    ),
  ];

  static List<BoxShadow> get shadowFloat => shadowLg;

  static List<BoxShadow> get shadowGlowSecondary => [
    BoxShadow(
      color: primary.withValues(alpha: 0.35),
      blurRadius: 24,
      offset: const Offset(0, 4),
      spreadRadius: -4,
    ),
  ];

  static List<BoxShadow> get shadowGlowAccent => [
    BoxShadow(
      color: accent.withValues(alpha: 0.3),
      blurRadius: 20,
      offset: const Offset(0, 4),
      spreadRadius: -4,
    ),
  ];

  // ===========================================================================
  // Border radius
  // ===========================================================================

  static const double radiusSm = 8;
  static const double radiusMd = 12;
  static const double radiusLg = 16;
  static const double radiusXl = 20;
  static const double radius2xl = 24;
  static const double radius3xl = 28;
  static const double radiusFull = 999;

  // ===========================================================================
  // Glassmorphism — dark variant
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
            // Dark glass — semi-transparent #111 over whatever's behind.
            color: color ?? card.withValues(alpha: 0.72),
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
  // Full-player background gradient
  // ===========================================================================

  /// Linear gradient from #111 (top) to pure black (bottom). Used by the
  /// full audio player screen as a subtle vertical wash.
  static const LinearGradient fullPlayerGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [card, background],
  );

  // ===========================================================================
  // Typography
  // ===========================================================================

  /// Display / headers / titles — Kufam.
  static const String fontKufam = 'Kufam';

  /// Body / subtitles / captions — ReadexPro.
  static const String fontReadexPro = 'ReadexPro';

  /// Backwards-compatible aliases. Existing call sites that read
  /// `fontFustat` / `fontNotoNaskh` keep working — the values now point at
  /// the AMOLED-theme fonts. New code should prefer fontKufam / fontReadexPro
  /// for clarity.
  static const String fontFustat = fontKufam;
  static const String fontNotoNaskh = fontReadexPro;

  static TextTheme _buildTextTheme() {
    return const TextTheme(
      // Display — Kufam for large decorative headings
      displayLarge: TextStyle(fontFamily: fontKufam, color: foreground),
      displayMedium: TextStyle(fontFamily: fontKufam, color: foreground),
      displaySmall: TextStyle(fontFamily: fontKufam, color: foreground),

      // Headline — Kufam bold for section titles
      headlineLarge: TextStyle(
        fontFamily: fontKufam,
        color: foreground,
        fontWeight: FontWeight.w700,
      ),
      headlineMedium: TextStyle(
        fontFamily: fontKufam,
        color: foreground,
        fontWeight: FontWeight.w700,
      ),
      headlineSmall: TextStyle(
        fontFamily: fontKufam,
        color: foreground,
        fontWeight: FontWeight.bold,
      ),

      // Title — Kufam bold for card titles, app bars
      titleLarge: TextStyle(
        fontFamily: fontKufam,
        color: foreground,
        fontWeight: FontWeight.bold,
        fontSize: 20,
      ),
      titleMedium: TextStyle(
        fontFamily: fontKufam,
        color: foreground,
        fontWeight: FontWeight.bold,
      ),
      titleSmall: TextStyle(
        fontFamily: fontKufam,
        color: foreground,
        fontWeight: FontWeight.w600,
      ),

      // Body — ReadexPro for readable Arabic prose
      bodyLarge: TextStyle(fontFamily: fontReadexPro, color: foreground),
      bodyMedium: TextStyle(fontFamily: fontReadexPro, color: foreground),
      bodySmall: TextStyle(fontFamily: fontReadexPro, color: mutedForeground),

      // Label — Kufam bold for buttons, chips, nav labels
      labelLarge: TextStyle(
        fontFamily: fontKufam,
        color: foreground,
        fontWeight: FontWeight.bold,
      ),
      labelMedium: TextStyle(
        fontFamily: fontKufam,
        color: mutedForeground,
        fontWeight: FontWeight.bold,
      ),
      labelSmall: TextStyle(
        fontFamily: fontKufam,
        color: mutedForeground,
        fontWeight: FontWeight.bold,
      ),
    );
  }

  // ===========================================================================
  // Color scheme — Brightness.dark
  // ===========================================================================

  static const ColorScheme colorScheme = ColorScheme(
    brightness: Brightness.dark,
    primary: primary,
    onPrimary: background,
    primaryContainer: Color(0xFF064E3B),       // emerald-900
    onPrimaryContainer: Color(0xFFD1FAE5),     // emerald-100
    secondary: primary,
    onSecondary: background,
    secondaryContainer: Color(0xFF064E3B),
    onSecondaryContainer: Color(0xFFD1FAE5),
    tertiary: accent,
    onTertiary: accentForeground,
    tertiaryContainer: Color(0xFF44340A),      // dim gold backing
    onTertiaryContainer: Color(0xFFFFE4AD),
    error: destructive,
    onError: Color(0xFFFFFFFF),
    surface: card,
    onSurface: foreground,
    onSurfaceVariant: mutedForeground,
    outline: border,
    outlineVariant: muted,
    shadow: Color(0xFF000000),
    scrim: Color(0xFF000000),
    inverseSurface: Color(0xFFE4E4E7),         // zinc-200 (rare, for snackbar contrast)
    onInverseSurface: Color(0xFF18181B),
    inversePrimary: Color(0xFF065F46),
    surfaceContainerHighest: muted,
  );

  // ===========================================================================
  // ThemeData
  // ===========================================================================

  /// `lightTheme` is the public name kept for backwards compatibility with
  /// the call site in `app.dart`. It is now a DARK theme — AMOLED is the
  /// single, default theme for the app. There is no light variant.
  static final ThemeData lightTheme = _buildDarkTheme();

  /// Alias for clarity if call sites want to be explicit.
  static final ThemeData darkTheme = _buildDarkTheme();

  static ThemeData _buildDarkTheme() {
    final textTheme = _buildTextTheme();

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: background,
      canvasColor: background,
      textTheme: textTheme,
      appBarTheme: AppBarTheme(
        backgroundColor: background,
        foregroundColor: foreground,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: textTheme.titleLarge?.copyWith(
          fontWeight: FontWeight.bold,
          color: foreground,
        ),
        iconTheme: const IconThemeData(color: foreground),
      ),
      cardTheme: CardThemeData(
        color: card,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusLg),
          side: BorderSide(color: border.withValues(alpha: 0.6)),
        ),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: card,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radius2xl),
        ),
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: card,
        surfaceTintColor: Colors.transparent,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(radius2xl)),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: card,
        indicatorColor: navActiveIndicator,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return textTheme.labelSmall?.copyWith(
              color: navSelected,
              fontWeight: FontWeight.bold,
              fontSize: 10,
            );
          }
          return textTheme.labelSmall?.copyWith(
            color: navUnselected,
            fontSize: 10,
          );
        }),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: background,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radiusFull),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          elevation: 0,
          textStyle: textTheme.labelLarge?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: background,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radiusLg),
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: primary,
          textStyle: textTheme.labelLarge,
        ),
      ),
      iconButtonTheme: IconButtonThemeData(
        style: IconButton.styleFrom(foregroundColor: foreground),
      ),
      iconTheme: const IconThemeData(color: foreground, size: 24),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: input,
        hintStyle: textTheme.bodyMedium?.copyWith(color: mutedForeground),
        labelStyle: textTheme.bodyMedium?.copyWith(color: mutedForeground),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusLg),
          borderSide: BorderSide(color: border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusLg),
          borderSide: BorderSide(color: border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusLg),
          borderSide: const BorderSide(color: primary, width: 1.5),
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 14,
        ),
      ),
      sliderTheme: SliderThemeData(
        activeTrackColor: primary,
        inactiveTrackColor: muted,
        thumbColor: primary,
        overlayColor: primary.withValues(alpha: 0.15),
        trackHeight: 4,
        thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 7),
      ),
      dividerTheme: const DividerThemeData(
        color: border,
        thickness: 1,
        space: 0,
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: muted,
        contentTextStyle: textTheme.bodyMedium?.copyWith(color: foreground),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusMd),
        ),
        behavior: SnackBarBehavior.floating,
      ),
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: primary,
        linearTrackColor: muted,
      ),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) return primary;
          return mutedForeground;
        }),
        trackColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return primary.withValues(alpha: 0.4);
          }
          return muted;
        }),
        trackOutlineColor: WidgetStateProperty.all(border),
      ),
    );
  }

  // ===========================================================================
  // Directional icons
  // ===========================================================================

  /// RTL-aware play arrow — points left in Arabic, right in English.
  static IconData get playIcon => IconData(
    Icons.play_arrow_rounded.codePoint,
    fontFamily: Icons.play_arrow_rounded.fontFamily,
    fontPackage: Icons.play_arrow_rounded.fontPackage,
    matchTextDirection: true,
  );
}
