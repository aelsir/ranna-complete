import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:ranna/models/madha.dart';
import 'package:ranna/services/audio_player_service.dart';
import 'package:ranna/theme/app_theme.dart';
import 'package:ranna/utils/haptics.dart';

/// Shared "play this whole list" button.
///
/// Two visual variants — both wire the same playback handler AND fire the
/// same haptic, so any new screen with a list of tracks gets a play button
/// that behaves consistently without re-implementing the plumbing:
///
///   * [PlayAllButton.compact] — 48dp circular icon button. Used on
///     profile-style screens (المادح / الراوي / artist) where the play
///     control sits in an action row next to a Follow button. The
///     surrounding context (track count next to the title) already
///     communicates "play these N", so the button stays icon-only.
///
///   * [PlayAllButton.pill]    — pill button with icon + label "تشغيل".
///     Used on the playlist page where the button is a primary CTA on its
///     own row and benefits from an explicit verb.
///
/// To add a new variant later (e.g. ghost / outlined / large hero), add a
/// named constructor here and implement the surface in `_build*` — the
/// shared `_play` method handles haptic + queue priming + playback start
/// for every variant.
class PlayAllButton extends ConsumerWidget {
  /// The ordered list to play. Empty disables the button (no-op + grayed
  /// surface) so callers don't need to wrap in conditional rendering.
  final List<MadhaWithRelations> tracks;

  final _PlayAllButtonVariant _variant;
  final String _label;

  /// Circular 48dp icon button. Designed for action rows on profile pages.
  const PlayAllButton.compact({super.key, required this.tracks})
    : _variant = _PlayAllButtonVariant.compact,
      _label = '';

  /// Pill button with icon + label. Designed for the playlist hero area.
  const PlayAllButton.pill({
    super.key,
    required this.tracks,
    String label = 'تشغيل',
  }) : _variant = _PlayAllButtonVariant.pill,
       _label = label;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final enabled = tracks.isNotEmpty;
    final onTap = enabled ? () => _play(ref) : null;

    switch (_variant) {
      case _PlayAllButtonVariant.compact:
        return _buildCompact(onTap, enabled);
      case _PlayAllButtonVariant.pill:
        return _buildPill(onTap);
    }
  }

  /// Single source of truth for "what happens when play is tapped":
  /// haptic first, then hand off to the audio service. Every variant goes
  /// through here, so adding a behavior (analytics, offline check, etc.)
  /// once covers the whole surface.
  void _play(WidgetRef ref) {
    Haptics.selection();
    ref.read(audioPlayerProvider.notifier).playAll(tracks);
  }

  Widget _buildCompact(VoidCallback? onTap, bool enabled) {
    final color = enabled ? RannaTheme.secondary : RannaTheme.muted;
    return Material(
      color: color,
      shape: const CircleBorder(),
      elevation: enabled ? 4 : 0,
      shadowColor: RannaTheme.secondary.withValues(alpha: 0.3),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: SizedBox(
          width: 48,
          height: 48,
          child: Icon(
            // RTL-aware play glyph already chosen by the theme.
            RannaTheme.playIcon,
            size: 24,
            color: enabled
                ? RannaTheme.secondaryForeground
                : RannaTheme.mutedForeground,
          ),
        ),
      ),
    );
  }

  Widget _buildPill(VoidCallback? onTap) {
    return Container(
      decoration: BoxDecoration(
        boxShadow: RannaTheme.shadowGlowAccent,
        borderRadius: BorderRadius.circular(12),
      ),
      child: ElevatedButton.icon(
        onPressed: onTap,
        style: ElevatedButton.styleFrom(
          backgroundColor: RannaTheme.accent,
          foregroundColor: RannaTheme.accentForeground,
        ),
        icon: Icon(RannaTheme.playIcon),
        label: Text(_label),
      ),
    );
  }
}

enum _PlayAllButtonVariant { compact, pill }
