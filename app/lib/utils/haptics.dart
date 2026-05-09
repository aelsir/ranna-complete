import 'package:flutter/services.dart';

/// Single source of truth for haptic feedback in the app.
///
/// Why a wrapper instead of calling `HapticFeedback.*` everywhere:
///   - Lets us tune intensities globally (e.g. soften everything on Android,
///     where `selectionClick` can feel sharper than iOS).
///   - Lets us add a kill-switch later (accessibility setting, battery saver)
///     in one place.
///
/// Picking a level: think *user intent*, not magnitude.
///   - [selection]  : low-friction taps that just confirm "I touched it"
///                    (play/pause, skip, tab change, filter chip, row tap).
///   - [light]      : adding/committing something that wasn't there
///                    (favorite ON, queue insert, pull-to-refresh trigger).
///   - [medium]     : finalizing an action with weight (swipe-to-dismiss
///                    crossing the threshold, download started).
///   - [heavy]      : reserve for destructive confirms / errors.
class Haptics {
  Haptics._();

  /// Light "tick" — the default for taps that toggle UI state.
  static void selection() => HapticFeedback.selectionClick();

  /// Soft thump — for *adding* something (favorite ON, queue insert).
  static void light() => HapticFeedback.lightImpact();

  /// Stronger thump — for *committing* a gesture (swipe-to-dismiss).
  static void medium() => HapticFeedback.mediumImpact();

  /// Strongest — destructive / error feedback. Use sparingly.
  static void heavy() => HapticFeedback.heavyImpact();
}
