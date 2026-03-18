import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:ranna/components/common/ranna_image.dart';
import 'package:ranna/services/audio_player_service.dart';
import 'package:ranna/theme/app_theme.dart';
import 'package:ranna/utils/format.dart';

/// A floating mini player bar with glass-dark styling.
///
/// Positioned by its parent (no [Positioned] here). Shows the current track
/// with cover art, title, seek slider, and prev/play/next controls.
///
/// Renders [SizedBox.shrink] when no track is loaded.
class MiniPlayer extends ConsumerWidget {
  const MiniPlayer({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final track = ref.watch(currentTrackProvider);

    if (track == null) return const SizedBox.shrink();

    final isPlaying = ref.watch(isPlayingProvider);
    final position = ref.watch(audioPlayerProvider.select((s) => s.position));
    final duration = ref.watch(audioPlayerProvider.select((s) => s.duration));
    final hasPrevious = ref.watch(audioPlayerProvider.select((s) => s.hasPrevious));
    final hasNext = ref.watch(audioPlayerProvider.select((s) => s.hasNext));
    final notifier = ref.read(audioPlayerProvider.notifier);

    return GestureDetector(
      onTap: () => notifier.openFullPlayer(),
      behavior: HitTestBehavior.opaque,
      child: Container(
        decoration: BoxDecoration(
          color: RannaTheme.primary,
          borderRadius: BorderRadius.circular(RannaTheme.radius3xl),
          border: Border.all(
            color: RannaTheme.primaryForeground.withValues(alpha: 0.05),
          ),
          boxShadow: RannaTheme.shadowFloat,
        ),
        clipBehavior: Clip.antiAlias,
        child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            child: Row(
              children: [
                // --- Cover art with coral glow ---
                GestureDetector(
                  onTap: () => notifier.openFullPlayer(),
                  child: Stack(
                    clipBehavior: Clip.none,
                    children: [
                      // Coral glow behind
                      Positioned.fill(
                        child: Container(
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(RannaTheme.radiusSm),
                            boxShadow: [
                              BoxShadow(
                                color: RannaTheme.accent.withValues(alpha: 0.20),
                                blurRadius: 12,
                              ),
                            ],
                          ),
                        ),
                      ),
                      // Cover image
                      RannaImage(
                        url: track.imageUrl ?? track.madihDetails?.imageUrl,
                        width: 44,
                        height: 44,
                        borderRadius: BorderRadius.circular(RannaTheme.radiusSm),
                        fallbackWidget: Container(
                          decoration: const BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topRight,
                              end: Alignment.bottomLeft,
                              colors: [RannaTheme.primary, RannaTheme.primaryGlow],
                            ),
                          ),
                          child: const Icon(
                            Icons.music_note_rounded,
                            color: Colors.white54,
                            size: 22,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(width: 12),

                // --- Center section: title + slider + time ---
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Title
                      Text(
                        track.title,
                        style: TextStyle(fontFamily: RannaTheme.fontFustat,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),

                      const SizedBox(height: 4),

                      // Seek slider
                      SizedBox(
                        height: 14,
                        child: SliderTheme(
                          data: SliderThemeData(
                            trackHeight: 4,
                            trackShape: const RoundedRectSliderTrackShape(),
                            activeTrackColor: RannaTheme.accent,
                            inactiveTrackColor:
                                RannaTheme.primaryForeground.withValues(alpha: 0.15),
                            thumbColor: RannaTheme.accent,
                            thumbShape:
                                const RoundSliderThumbShape(enabledThumbRadius: 7),
                            overlayShape:
                                const RoundSliderOverlayShape(overlayRadius: 14),
                            overlayColor: RannaTheme.accent.withValues(alpha: 0.12),
                          ),
                          child: Slider(
                            value: position.inSeconds
                                .toDouble()
                                .clamp(
                                  0,
                                  duration.inSeconds
                                      .toDouble()
                                      .clamp(0, double.infinity),
                                ),
                            min: 0,
                            max: duration.inSeconds > 0
                                ? duration.inSeconds.toDouble()
                                : 1,
                            onChanged: (value) {
                              notifier.seekTo(Duration(seconds: value.toInt()));
                            },
                          ),
                        ),
                      ),

                      // Current time
                      Text(
                        formatDuration(position.inSeconds),
                        style: TextStyle(fontFamily: RannaTheme.fontFustat,
                          fontSize: 10,
                          color:
                              RannaTheme.primaryForeground.withValues(alpha: 0.40),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(width: 12),

                // --- Controls (RTL-aware: next on right, prev on left) ---
                // Next
                _MiniControlButton(
                  icon: Icons.skip_next_rounded,
                  size: 32,
                  iconColor:
                      RannaTheme.primaryForeground.withValues(alpha: 0.40),
                  onTap: hasNext
                      ? () => notifier.playNext()
                      : null,
                  flipHorizontally: true,
                ),

                // Play/Pause
                GestureDetector(
                  onTap: () => notifier.togglePlay(),
                  child: Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: RannaTheme.primaryForeground,
                      shape: BoxShape.circle,
                      boxShadow: RannaTheme.shadowMd,
                    ),
                    child: Icon(
                      isPlaying
                          ? Icons.pause_rounded
                          : Icons.play_arrow_rounded,
                      color: RannaTheme.primary,
                      size: 24,
                    ),
                  ),
                ),

                // Previous
                _MiniControlButton(
                  icon: Icons.skip_previous_rounded,
                  size: 32,
                  iconColor:
                      RannaTheme.primaryForeground.withValues(alpha: 0.40),
                  onTap: hasPrevious
                      ? () => notifier.playPrevious()
                      : null,
                  flipHorizontally: true,
                ),
              ],
            ),
          ),
        ),
    );
  }
}

/// Ghost-style icon button used in the mini player controls.
class _MiniControlButton extends StatelessWidget {
  final IconData icon;
  final double size;
  final Color iconColor;
  final VoidCallback? onTap;
  final bool flipHorizontally;

  const _MiniControlButton({
    required this.icon,
    required this.size,
    required this.iconColor,
    this.onTap,
    this.flipHorizontally = false,
  });

  @override
  Widget build(BuildContext context) {
    Widget iconWidget = Icon(
      icon,
      size: size * 0.65,
      color: onTap != null
          ? iconColor
          : iconColor.withValues(alpha: 0.25),
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
