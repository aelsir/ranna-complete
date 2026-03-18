import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ranna/services/audio_player_service.dart';
import 'package:ranna/theme/app_theme.dart';

/// Playback control row used by the full-screen player.
///
/// Displays five buttons in logical order:
///   [skipBackward 15s] [previous] [play/pause] [next] [skipForward 15s]
///
/// In RTL context the [Row] auto-reverses, so skip-backward appears on the
/// visual right -- which is the expected layout for RTL music apps.
///
/// Styling follows the full player spec:
///   - Rewind/Forward: 40dp ghost buttons, Icons.replay_10 / Icons.forward_10
///   - Previous/Next: 48dp ghost, primaryForeground/60%
///   - Play/Pause: 64dp circle, bg-primaryForeground text-primary, shadow-glow-accent
class PlayerControls extends ConsumerWidget {
  const PlayerControls({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final playerState = ref.watch(audioPlayerProvider);
    final isPlaying = playerState.isPlaying;
    final notifier = ref.read(audioPlayerProvider.notifier);

    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        // --- Skip forward 10s (RTL: visual right) ---
        _GhostButton(
          icon: Icons.forward_10,
          size: 40,
          iconSize: 24,
          iconColor: RannaTheme.primaryForeground.withValues(alpha: 0.60),
          onTap: () => notifier.skipForward(),
        ),

        const SizedBox(width: 12),

        // --- Next track (RTL: visual right of play) ---
        _GhostButton(
          icon: Icons.skip_next_rounded,
          size: 48,
          iconSize: 30,
          iconColor: playerState.hasNext
              ? RannaTheme.primaryForeground.withValues(alpha: 0.60)
              : RannaTheme.primaryForeground.withValues(alpha: 0.20),
          onTap: playerState.hasNext ? () => notifier.playNext() : null,
          flipHorizontally: true,
        ),

        const SizedBox(width: 20),

        // --- Play / Pause (large circular button) ---
        GestureDetector(
          onTap: () => notifier.togglePlay(),
          child: Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: RannaTheme.primaryForeground,
              shape: BoxShape.circle,
              boxShadow: RannaTheme.shadowGlowAccent,
            ),
            child: Center(
              child: Icon(
                isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded,
                color: RannaTheme.primary,
                size: 36,
              ),
            ),
          ),
        ),

        const SizedBox(width: 20),

        // --- Previous track (RTL: visual left of play) ---
        _GhostButton(
          icon: Icons.skip_previous_rounded,
          size: 48,
          iconSize: 30,
          iconColor: playerState.hasPrevious
              ? RannaTheme.primaryForeground.withValues(alpha: 0.60)
              : RannaTheme.primaryForeground.withValues(alpha: 0.20),
          onTap: playerState.hasPrevious ? () => notifier.playPrevious() : null,
          flipHorizontally: true,
        ),

        const SizedBox(width: 12),

        // --- Skip backward 10s (RTL: visual left) ---
        _GhostButton(
          icon: Icons.replay_10,
          size: 40,
          iconSize: 24,
          iconColor: RannaTheme.primaryForeground.withValues(alpha: 0.60),
          onTap: () => notifier.skipBackward(),
        ),
      ],
    );
  }
}

/// A transparent (ghost) icon button with a fixed tap target size.
class _GhostButton extends StatelessWidget {
  final IconData icon;
  final double size;
  final double iconSize;
  final Color iconColor;
  final VoidCallback? onTap;
  final bool flipHorizontally;

  const _GhostButton({
    required this.icon,
    required this.size,
    required this.iconSize,
    required this.iconColor,
    this.onTap,
    this.flipHorizontally = false,
  });

  @override
  Widget build(BuildContext context) {
    Widget iconWidget = Icon(
      icon,
      size: iconSize,
      color: iconColor,
    );

    if (flipHorizontally) {
      iconWidget = Transform.flip(flipX: true, child: iconWidget);
    }

    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: SizedBox(
        width: size,
        height: size,
        child: Center(child: iconWidget),
      ),
    );
  }
}
