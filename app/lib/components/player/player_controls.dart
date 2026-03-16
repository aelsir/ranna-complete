import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ranna/services/audio_player_service.dart';
import 'package:ranna/theme/app_theme.dart';

/// Playback control row used by the full-screen player.
///
/// Displays five buttons in this logical order:
///   [skipBackward 15s] [previous] [play/pause] [next] [skipForward 15s]
///
/// In RTL context the [Row] auto-reverses, so skip-backward appears on the
/// visual right -- which is the expected layout for RTL music apps.
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
        // --- Skip backward 15 s ---
        IconButton(
          onPressed: () => notifier.skipBackward(),
          icon: const Icon(
            Icons.replay_10,
            size: 28,
            color: RannaTheme.foreground,
          ),
        ),

        const SizedBox(width: 16),

        // --- Previous track ---
        IconButton(
          onPressed:
              playerState.hasPrevious ? () => notifier.playPrevious() : null,
          icon: Icon(
            Icons.skip_previous_rounded,
            size: 36,
            color: playerState.hasPrevious
                ? RannaTheme.foreground
                : RannaTheme.mutedForeground,
          ),
        ),

        const SizedBox(width: 24),

        // --- Play / Pause (large circular button) ---
        GestureDetector(
          onTap: () => notifier.togglePlay(),
          child: Container(
            width: 64,
            height: 64,
            decoration: const BoxDecoration(
              color: RannaTheme.accent,
              shape: BoxShape.circle,
            ),
            child: Icon(
              isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded,
              color: Colors.white,
              size: 36,
            ),
          ),
        ),

        const SizedBox(width: 24),

        // --- Next track ---
        IconButton(
          onPressed: playerState.hasNext ? () => notifier.playNext() : null,
          icon: Icon(
            Icons.skip_next_rounded,
            size: 36,
            color: playerState.hasNext
                ? RannaTheme.foreground
                : RannaTheme.mutedForeground,
          ),
        ),

        const SizedBox(width: 16),

        // --- Skip forward 15 s ---
        IconButton(
          onPressed: () => notifier.skipForward(),
          icon: const Icon(
            Icons.forward_10,
            size: 28,
            color: RannaTheme.foreground,
          ),
        ),
      ],
    );
  }
}
