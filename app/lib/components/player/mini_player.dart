import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ranna/components/common/ranna_image.dart';
import 'package:ranna/services/audio_player_service.dart';
import 'package:ranna/theme/app_theme.dart';

/// A persistent mini player bar displayed at the bottom of the shell scaffold,
/// above the navigation bar.
///
/// Shows the currently playing track with cover art, title, artist, and a
/// play/pause toggle. Tapping the bar opens the full-screen player.
///
/// Renders [SizedBox.shrink] when no track is loaded.
class MiniPlayer extends ConsumerWidget {
  const MiniPlayer({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final track = ref.watch(currentTrackProvider);

    if (track == null) return const SizedBox.shrink();

    final isPlaying = ref.watch(isPlayingProvider);
    final playerState = ref.watch(audioPlayerProvider);
    final textTheme = Theme.of(context).textTheme;

    return GestureDetector(
      onTap: () => ref.read(audioPlayerProvider.notifier).openFullPlayer(),
      child: Container(
        decoration: BoxDecoration(
          color: RannaTheme.primary.withValues(alpha: 0.92),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // --- Progress indicator at the very top ---
            LinearProgressIndicator(
              value: playerState.progress,
              minHeight: 2,
              backgroundColor: RannaTheme.muted.withValues(alpha: 0.3),
              valueColor:
                  const AlwaysStoppedAnimation<Color>(RannaTheme.accent),
            ),

            // --- Main row: cover art | track info | play/pause ---
            Padding(
              padding: const EdgeInsetsDirectional.only(
                start: 12,
                end: 4,
                top: 8,
                bottom: 8,
              ),
              child: Row(
                children: [
                  // Cover art
                  RannaImage(
                    url: track.imageUrl ?? track.madihDetails?.imageUrl,
                    width: 48,
                    height: 48,
                    borderRadius: BorderRadius.circular(8),
                    fallbackWidget: Container(
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topRight,
                          end: Alignment.bottomLeft,
                          colors: [
                            RannaTheme.primary,
                            RannaTheme.primaryGlow,
                          ],
                        ),
                      ),
                      child: const Icon(
                        Icons.music_note_rounded,
                        color: Colors.white54,
                        size: 24,
                      ),
                    ),
                  ),

                  const SizedBox(width: 12),

                  // Title + artist
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          track.title,
                          style: textTheme.bodyMedium?.copyWith(
                            color: Colors.white,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          track.madihDetails?.name ?? track.madih,
                          style: textTheme.bodySmall?.copyWith(
                            color: Colors.white70,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),

                  // Play / Pause button
                  IconButton(
                    onPressed: () =>
                        ref.read(audioPlayerProvider.notifier).togglePlay(),
                    icon: Icon(
                      isPlaying
                          ? Icons.pause_rounded
                          : Icons.play_arrow_rounded,
                      color: Colors.white,
                      size: 32,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
