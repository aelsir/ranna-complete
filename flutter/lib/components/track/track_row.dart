import 'dart:math' as math;

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:ranna/models/madha.dart';
import 'package:ranna/services/audio_player_service.dart';
import 'package:ranna/theme/app_theme.dart';
import 'package:ranna/utils/format.dart';

/// A single track list item — the most widely reused component in Ranna.
///
/// Shows track number (or animated equalizer bars when playing), album art,
/// title, artist/rawi subtitle, and duration. Tapping the row populates the
/// track cache and starts playback through [AudioPlayerService].
class TrackRow extends ConsumerWidget {
  final MadhaWithRelations track;
  final int index;
  final List<MadhaWithRelations>? queue;
  final VoidCallback? onTap;

  const TrackRow({
    super.key,
    required this.track,
    required this.index,
    this.queue,
    this.onTap,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final playerState = ref.watch(audioPlayerProvider);
    final isCurrentTrack = playerState.currentTrackId == track.id;
    final isCurrentAndPlaying =
        isCurrentTrack && ref.watch(isPlayingProvider);

    return Material(
      color: isCurrentTrack
          ? RannaTheme.accent.withValues(alpha: 0.08)
          : Colors.transparent,
      child: InkWell(
        onTap: () {
          // Populate the track cache with all tracks in the queue.
          final tracksToCache = queue ?? [track];
          ref.read(trackCacheProvider.notifier).state = {
            ...ref.read(trackCacheProvider),
            for (final t in tracksToCache) t.id: t,
          };

          // Start playback.
          ref.read(audioPlayerProvider.notifier).playTrack(
                track.id,
                queue: tracksToCache.map((t) => t.id).toList(),
              );

          onTap?.call();
        },
        child: Padding(
          padding: const EdgeInsetsDirectional.fromSTEB(16, 10, 12, 10),
          child: Row(
            children: [
              // 1. Track number or equalizer bars
              SizedBox(
                width: 28,
                child: Center(
                  child: isCurrentAndPlaying
                      ? const _EqualizerBars()
                      : Text(
                          toArabicNum(index + 1),
                          style: Theme.of(context)
                              .textTheme
                              .labelMedium
                              ?.copyWith(color: RannaTheme.mutedForeground),
                          textAlign: TextAlign.center,
                        ),
                ),
              ),
              const SizedBox(width: 12),

              // 2. Album art
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: SizedBox(
                  width: 40,
                  height: 40,
                  child: CachedNetworkImage(
                    imageUrl: getImageUrl(track.imageUrl),
                    fit: BoxFit.cover,
                    errorWidget: (context, url, error) => Container(
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            RannaTheme.primary,
                            RannaTheme.primaryGlow,
                          ],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                      ),
                      child: Center(
                        child: Text(
                          track.title.isNotEmpty ? track.title[0] : '',
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),

              // 3. Title and subtitle
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      track.title,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            fontWeight:
                                isCurrentTrack ? FontWeight.w600 : FontWeight.w500,
                            color: isCurrentTrack
                                ? RannaTheme.accent
                                : RannaTheme.foreground,
                          ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      '${track.madihDetails?.name ?? track.madih}'
                      '${track.rawi != null ? ' - ${track.rawi!.name}' : ''}',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: RannaTheme.mutedForeground,
                          ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),

              // 4. Duration
              Text(
                formatDuration(track.durationSeconds),
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: RannaTheme.mutedForeground,
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Animated equalizer bars — shown in place of the track number when a track
// is actively playing.
// ---------------------------------------------------------------------------

class _EqualizerBars extends StatefulWidget {
  const _EqualizerBars();

  @override
  State<_EqualizerBars> createState() => _EqualizerBarsState();
}

class _EqualizerBarsState extends State<_EqualizerBars>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final List<Animation<double>> _barAnimations;

  // Each bar uses a different duration multiplier and starting offset to
  // create an organic-looking equalizer bounce effect.
  static const _barConfigs = [
    (minHeight: 4.0, maxHeight: 14.0, offset: 0.0),
    (minHeight: 4.0, maxHeight: 10.0, offset: 0.3),
    (minHeight: 4.0, maxHeight: 16.0, offset: 0.6),
  ];

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    )..repeat(reverse: true);

    _barAnimations = _barConfigs.map((config) {
      return Tween<double>(
        begin: config.minHeight,
        end: config.maxHeight,
      ).animate(
        CurvedAnimation(
          parent: _controller,
          curve: Interval(
            config.offset,
            math.min(config.offset + 0.6, 1.0),
            curve: Curves.easeInOut,
          ),
        ),
      );
    }).toList();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 20,
      height: 16,
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, _) {
          return Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: List.generate(3, (i) {
              return Container(
                width: 3,
                height: _barAnimations[i].value,
                decoration: BoxDecoration(
                  color: RannaTheme.accent,
                  borderRadius: BorderRadius.circular(1.5),
                ),
              );
            }),
          );
        },
      ),
    );
  }
}
