/// Ranna app theme configuration — matching the ranna-v2 webapp brand.
///
/// Provides a light, RTL-friendly Material 3 theme using the exact brand
/// colors from ranna-v2/src/index.css (HSL CSS variables).
///
/// Fonts: Fustat (headings), Noto Naskh Arabic (body).
library;

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Central theme configuration for the Ranna music streaming app.
///
/// All colors are derived from the ranna-v2 webapp CSS variables to ensure
/// visual consistency between the web and mobile apps.
class RannaTheme {
  RannaTheme._();

  // ---------------------------------------------------------------------------
  // Brand colors — mapped 1:1 from ranna-v2/src/index.css HSL values
  // ---------------------------------------------------------------------------

  /// --background: 160 10% 97%  →  light green-gray scaffold background
  static const Color background = Color(0xFFF5F7F5);

  /// --foreground: 184 43% 15%  →  dark teal for primary text
  static const Color foreground = Color(0xFF162F31);

  /// --card: 0 0% 100%  →  white card surfaces
  static const Color card = Color(0xFFFFFFFF);

  /// --primary: 184 43% 19%  →  deep teal for primary brand elements
  static const Color primary = Color(0xFF1C4644);

  /// --primary-glow: 184 50% 28%  →  lighter teal for hover/glow effects
  static const Color primaryGlow = Color(0xFF245E5C);

  /// --secondary: 73 100% 50%  →  bright lime/chartreuse for highlights
  static const Color secondary = Color(0xFFC8FF00);

  /// --secondary-foreground: 184 43% 12%  →  very dark teal on secondary
  static const Color secondaryForeground = Color(0xFF112B2C);

  /// --accent: 7 100% 70%  →  warm coral for play buttons and badges
  static const Color accent = Color(0xFFFF7866);

  /// --muted: 180 12% 93%  →  light gray for muted backgrounds
  static const Color muted = Color(0xFFE8EDED);

  /// --muted-foreground: 184 20% 46%  →  medium gray-teal for secondary text
  static const Color mutedForeground = Color(0xFF5E8385);

  /// --border: 180 12% 88%  →  subtle border color
  static const Color border = Color(0xFFD9E1E1);

  /// --input: 180 12% 91%
  static const Color input = Color(0xFFE0E8E8);

  /// --destructive: 0 84% 60%
  static const Color destructive = Color(0xFFEF4444);

  // ---------------------------------------------------------------------------
  // Shadow definitions — matching ranna-v2 CSS shadow variables
  // ---------------------------------------------------------------------------

  /// shadow-sm: subtle card shadow
  static List<BoxShadow> get shadowSm => [
        BoxShadow(
          color: primary.withValues(alpha: 0.04),
          blurRadius: 3,
          offset: const Offset(0, 1),
        ),
        BoxShadow(
          color: primary.withValues(alpha: 0.04),
          blurRadius: 2,
          offset: const Offset(0, 1),
          spreadRadius: -1,
        ),
      ];

  /// shadow-md: medium elevation shadow
  static List<BoxShadow> get shadowMd => [
        BoxShadow(
          color: primary.withValues(alpha: 0.08),
          blurRadius: 16,
          offset: const Offset(0, 4),
          spreadRadius: -2,
        ),
        BoxShadow(
          color: primary.withValues(alpha: 0.04),
          blurRadius: 6,
          offset: const Offset(0, 2),
          spreadRadius: -2,
        ),
      ];

  /// shadow-glow-secondary: lime glow effect
  static List<BoxShadow> get shadowGlowSecondary => [
        BoxShadow(
          color: secondary.withValues(alpha: 0.35),
          blurRadius: 24,
          offset: const Offset(0, 4),
          spreadRadius: -4,
        ),
      ];

  /// shadow-glow-accent: coral glow effect
  static List<BoxShadow> get shadowGlowAccent => [
        BoxShadow(
          color: accent.withValues(alpha: 0.3),
          blurRadius: 20,
          offset: const Offset(0, 4),
          spreadRadius: -4,
        ),
      ];

  // ---------------------------------------------------------------------------
  // Typography helpers
  // ---------------------------------------------------------------------------

  /// Returns a [TextTheme] using **Fustat** for display/headline/title styles
  /// and **Noto Naskh Arabic** for body/label styles.
  static TextTheme _buildTextTheme() {
    final fustatTheme = GoogleFonts.fustatTextTheme(const TextTheme());
    final notoNaskhTheme =
        GoogleFonts.notoNaskhArabicTextTheme(const TextTheme());

    return TextTheme(
      // Display — Fustat
      displayLarge: fustatTheme.displayLarge?.copyWith(color: foreground),
      displayMedium: fustatTheme.displayMedium?.copyWith(color: foreground),
      displaySmall: fustatTheme.displaySmall?.copyWith(color: foreground),

      // Headline — Fustat
      headlineLarge: fustatTheme.headlineLarge?.copyWith(color: foreground),
      headlineMedium: fustatTheme.headlineMedium?.copyWith(color: foreground),
      headlineSmall: fustatTheme.headlineSmall?.copyWith(color: foreground),

      // Title — Fustat
      titleLarge: fustatTheme.titleLarge?.copyWith(color: foreground),
      titleMedium: fustatTheme.titleMedium?.copyWith(color: foreground),
      titleSmall: fustatTheme.titleSmall?.copyWith(color: foreground),

      // Body — Noto Naskh Arabic for legibility
      bodyLarge: notoNaskhTheme.bodyLarge?.copyWith(color: foreground),
      bodyMedium: notoNaskhTheme.bodyMedium?.copyWith(color: foreground),
      bodySmall: notoNaskhTheme.bodySmall?.copyWith(color: mutedForeground),

      // Label — Noto Naskh Arabic
      labelLarge: notoNaskhTheme.labelLarge?.copyWith(color: foreground),
      labelMedium:
          notoNaskhTheme.labelMedium?.copyWith(color: mutedForeground),
      labelSmall: notoNaskhTheme.labelSmall?.copyWith(color: mutedForeground),
    );
  }

  // ---------------------------------------------------------------------------
  // Color scheme
  // ---------------------------------------------------------------------------

  /// Material 3 [ColorScheme] derived from the ranna-v2 brand palette (LIGHT).
  static const ColorScheme colorScheme = ColorScheme(
    brightness: Brightness.light,
    primary: primary,
    onPrimary: Color(0xFFFFFFFF),
    primaryContainer: Color(0xFFD0F0EE),
    onPrimaryContainer: foreground,
    secondary: secondary,
    onSecondary: secondaryForeground,
    secondaryContainer: Color(0xFFE8FFB3),
    onSecondaryContainer: secondaryForeground,
    tertiary: accent,
    onTertiary: Color(0xFFFFFFFF),
    tertiaryContainer: Color(0xFFFFDAD5),
    onTertiaryContainer: Color(0xFF410002),
    error: destructive,
    onError: Color(0xFFFFFFFF),
    surface: card,
    onSurface: foreground,
    onSurfaceVariant: mutedForeground,
    outline: border,
    outlineVariant: Color(0xFFE8EDED),
    shadow: Color(0xFF000000),
    scrim: Color(0xFF000000),
    inverseSurface: foreground,
    onInverseSurface: Color(0xFFF5F5F5),
    inversePrimary: Color(0xFF80CBC4),
    surfaceContainerHighest: muted,
  );

  // ---------------------------------------------------------------------------
  // Theme data
  // ---------------------------------------------------------------------------

  /// The main light [ThemeData] for the Ranna app.
  ///
  /// Use as: `theme: RannaTheme.lightTheme`
  static ThemeData get lightTheme {
    final textTheme = _buildTextTheme();

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: background,
      textTheme: textTheme,

      // AppBar ----------------------------------------------------------------
      appBarTheme: AppBarTheme(
        backgroundColor: primary,
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: textTheme.titleLarge?.copyWith(
          fontWeight: FontWeight.w600,
          color: Colors.white,
        ),
        iconTheme: const IconThemeData(color: Colors.white),
      ),

      // Card ------------------------------------------------------------------
      cardTheme: CardThemeData(
        color: card,
        elevation: 0,
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: border.withValues(alpha: 0.5)),
        ),
      ),

      // Navigation Bar (Material 3) ------------------------------------------
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: card,
        indicatorColor: primary.withValues(alpha: 0.1),
        elevation: 2,
        surfaceTintColor: Colors.transparent,
        shadowColor: primary.withValues(alpha: 0.08),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const IconThemeData(color: accent);
          }
          return const IconThemeData(color: mutedForeground);
        }),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return textTheme.labelSmall?.copyWith(color: accent);
          }
          return textTheme.labelSmall?.copyWith(color: mutedForeground);
        }),
      ),

      // Elevated Button -------------------------------------------------------
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: accent,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          textStyle: textTheme.labelLarge?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
      ),

      // Text Button ------------------------------------------------------------
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: primary,
          textStyle: textTheme.labelLarge,
        ),
      ),

      // Icon Button ------------------------------------------------------------
      iconButtonTheme: IconButtonThemeData(
        style: IconButton.styleFrom(
          foregroundColor: foreground,
        ),
      ),

      // Icon Theme -------------------------------------------------------------
      iconTheme: const IconThemeData(
        color: foreground,
        size: 24,
      ),

      // Input / TextField ------------------------------------------------------
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: card,
        hintStyle: textTheme.bodyMedium?.copyWith(color: mutedForeground),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: secondary, width: 1.5),
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 14,
        ),
      ),

      // Bottom Sheet -----------------------------------------------------------
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: card,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
      ),

      // Dialog -----------------------------------------------------------------
      dialogTheme: DialogThemeData(
        backgroundColor: card,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        titleTextStyle: textTheme.titleLarge,
        contentTextStyle: textTheme.bodyMedium,
      ),

      // Slider (for seek bar) -------------------------------------------------
      sliderTheme: SliderThemeData(
        activeTrackColor: accent,
        inactiveTrackColor: muted,
        thumbColor: accent,
        overlayColor: accent.withValues(alpha: 0.15),
        trackHeight: 3,
        thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 6),
      ),

      // Divider ---------------------------------------------------------------
      dividerTheme: const DividerThemeData(
        color: border,
        thickness: 0.5,
        space: 0,
      ),

      // ListTile --------------------------------------------------------------
      listTileTheme: ListTileThemeData(
        iconColor: mutedForeground,
        textColor: foreground,
        contentPadding:
            const EdgeInsetsDirectional.only(start: 16, end: 16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),

      // Chip ------------------------------------------------------------------
      chipTheme: ChipThemeData(
        backgroundColor: muted,
        selectedColor: primary.withValues(alpha: 0.15),
        disabledColor: muted.withValues(alpha: 0.5),
        labelStyle: textTheme.labelMedium?.copyWith(color: foreground),
        side: BorderSide.none,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      ),

      // SnackBar --------------------------------------------------------------
      snackBarTheme: SnackBarThemeData(
        backgroundColor: foreground,
        contentTextStyle: textTheme.bodyMedium?.copyWith(color: Colors.white),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        behavior: SnackBarBehavior.floating,
      ),

      // Progress Indicator ----------------------------------------------------
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: accent,
        linearTrackColor: muted,
      ),
    );
  }
}
