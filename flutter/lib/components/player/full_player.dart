import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ranna/components/player/player_controls.dart';
import 'package:ranna/services/audio_player_service.dart';
import 'package:ranna/theme/app_theme.dart';
import 'package:ranna/utils/format.dart';

/// Full-screen player overlay shown when [isFullPlayerOpenProvider] is `true`.
///
/// Designed as a standalone widget that the shell scaffold renders as a
/// [Stack] layer. When visible it covers the entire screen with a slide-up
/// animation; when hidden it collapses to [SizedBox.shrink].
///
/// Layout (top to bottom):
///   1. Top bar with close button and "Now Playing" title
///   2. Spacer
///   3. Cover art (280 px, rounded, accent glow shadow)
///   4. Track info (title, artist, rawi)
///   5. Seek bar with position / duration labels
///   6. [PlayerControls] row
///   7. Spacer
class FullPlayer extends ConsumerWidget {
  const FullPlayer({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isOpen = ref.watch(isFullPlayerOpenProvider);
    final track = ref.watch(currentTrackProvider);
    final playerState = ref.watch(audioPlayerProvider);
    final textTheme = Theme.of(context).textTheme;

    // Animated entrance/exit
    return AnimatedSlide(
      offset: isOpen ? Offset.zero : const Offset(0, 1),
      duration: const Duration(milliseconds: 350),
      curve: Curves.easeOutCubic,
      child: AnimatedOpacity(
        opacity: isOpen ? 1.0 : 0.0,
        duration: const Duration(milliseconds: 300),
        child: Visibility(
          visible: isOpen,
          child: Material(
            color: RannaTheme.card,
            child: SafeArea(
              child: Column(
                children: [
                  // =========================================================
                  // 1. Top bar
                  // =========================================================
                  Padding(
                    padding: const EdgeInsetsDirectional.only(
                      start: 4,
                      end: 16,
                      top: 8,
                    ),
                    child: Row(
                      children: [
                        IconButton(
                          onPressed: () => ref
                              .read(audioPlayerProvider.notifier)
                              .closeFullPlayer(),
                          icon: const Icon(
                            Icons.keyboard_arrow_down_rounded,
                            size: 32,
                            color: RannaTheme.foreground,
                          ),
                        ),
                        const Expanded(
                          child: Text(
                            '\u0627\u0644\u0622\u0646 \u064A\u064F\u0633\u062A\u0645\u0639', // الآن يُستمع
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: RannaTheme.mutedForeground,
                            ),
                          ),
                        ),
                        // Invisible placeholder to keep title centred
                        const SizedBox(width: 48),
                      ],
                    ),
                  ),

                  // =========================================================
                  // 2. Spacer
                  // =========================================================
                  const Spacer(),

                  // =========================================================
                  // 3. Cover art
                  // =========================================================
                  Center(
                    child: Container(
                      width: 280,
                      height: 280,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(24),
                        boxShadow: RannaTheme.shadowGlowAccent,
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(24),
                        child: track != null
                            ? CachedNetworkImage(
                                imageUrl: getImageUrl(
                                  track.imageUrl ??
                                      track.madihDetails?.imageUrl,
                                ),
                                fit: BoxFit.cover,
                                placeholder: (context, url) =>
                                    _buildFallbackCover(),
                                errorWidget: (context, url, error) =>
                                    _buildFallbackCover(),
                              )
                            : _buildFallbackCover(),
                      ),
                    ),
                  ),

                  const SizedBox(height: 32),

                  // =========================================================
                  // 4. Track info
                  // =========================================================
                  Padding(
                    padding: const EdgeInsetsDirectional.symmetric(
                      horizontal: 32,
                    ),
                    child: Column(
                      children: [
                        Text(
                          track?.title ?? '',
                          style: textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: RannaTheme.foreground,
                          ),
                          textAlign: TextAlign.center,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          track?.madihDetails?.name ?? track?.madih ?? '',
                          style: textTheme.bodyMedium?.copyWith(
                            color: RannaTheme.mutedForeground,
                          ),
                          textAlign: TextAlign.center,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        if (track?.rawi?.name != null) ...[
                          const SizedBox(height: 4),
                          Text(
                            '\u0631\u0648\u0627\u064A\u0629: ${track!.rawi!.name}', // رواية:
                            style: textTheme.bodySmall?.copyWith(
                              color: RannaTheme.mutedForeground,
                            ),
                            textAlign: TextAlign.center,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  // =========================================================
                  // 5. Seek bar
                  // =========================================================
                  Padding(
                    padding: const EdgeInsetsDirectional.symmetric(
                      horizontal: 24,
                    ),
                    child: Column(
                      children: [
                        Slider.adaptive(
                          value: playerState.position.inSeconds
                              .toDouble()
                              .clamp(
                                0,
                                playerState.duration.inSeconds
                                    .toDouble()
                                    .clamp(0, double.infinity),
                              ),
                          min: 0,
                          max: playerState.duration.inSeconds > 0
                              ? playerState.duration.inSeconds.toDouble()
                              : 1,
                          activeColor: RannaTheme.accent,
                          inactiveColor: RannaTheme.muted,
                          onChanged: (value) {
                            ref
                                .read(audioPlayerProvider.notifier)
                                .seekTo(Duration(seconds: value.toInt()));
                          },
                        ),
                        Padding(
                          padding: const EdgeInsetsDirectional.symmetric(
                            horizontal: 8,
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              // In RTL: this shows on the right (start side)
                              Text(
                                formatDuration(
                                  playerState.position.inSeconds,
                                ),
                                style: textTheme.bodySmall?.copyWith(
                                  color: RannaTheme.mutedForeground,
                                ),
                              ),
                              // In RTL: this shows on the left (end side)
                              Text(
                                formatDuration(
                                  playerState.duration.inSeconds,
                                ),
                                style: textTheme.bodySmall?.copyWith(
                                  color: RannaTheme.mutedForeground,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16),

                  // =========================================================
                  // 6. Player controls
                  // =========================================================
                  const PlayerControls(),

                  // =========================================================
                  // 7. Spacer
                  // =========================================================
                  const Spacer(),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  /// Gradient fallback used when cover art fails to load.
  Widget _buildFallbackCover() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topRight,
          end: Alignment.bottomLeft,
          colors: [RannaTheme.primary, RannaTheme.primaryGlow],
        ),
      ),
      child: const Center(
        child: Icon(
          Icons.music_note_rounded,
          color: Colors.white54,
          size: 64,
        ),
      ),
    );
  }
}
