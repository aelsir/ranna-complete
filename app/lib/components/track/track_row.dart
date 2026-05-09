import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:ranna/components/common/ranna_image.dart';
import 'package:ranna/components/track/track_action_sheet.dart';
import 'package:ranna/components/track/track_queue_scope.dart';
import 'package:ranna/models/madha.dart';
import 'package:ranna/providers/favorites_provider.dart';
import 'package:ranna/utils/responsive.dart';
import 'package:ranna/services/audio_player_service.dart';
import 'package:ranna/theme/app_theme.dart';
import 'package:ranna/utils/format.dart';
import 'package:ranna/utils/haptics.dart';

/// A single track list item.
///
/// Auto-advance is queue-driven: tapping this row plays the track AND tells
/// the audio player about the surrounding queue, so when this track ends
/// the player advances to the next one in the list.
///
/// Queue resolution order (first non-null wins):
///   1. The explicit [queue] parameter (legacy / one-off contexts).
///   2. The nearest enclosing [TrackQueueScope] (preferred for lists —
///      wrap once at the list level instead of per-item).
///   3. `[track]` — single-track queue, plays just this one and stops.
class TrackRow extends ConsumerWidget {
  final MadhaWithRelations track;
  final int index;

  /// Explicit queue override. Prefer wrapping the list in [TrackQueueScope]
  /// instead — that way every row in the list inherits the queue without
  /// the parent having to thread it through each item.
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
    final isCurrentTrack = ref.watch(audioPlayerProvider.select((s) => s.currentTrackId)) == track.id;
    final isCurrentAndPlaying = isCurrentTrack && ref.watch(isPlayingProvider);
    final isFav = ref.watch(favoritesProvider.select((s) => s.contains(track.id)));

    // Build subtitle: "Artist · Narrator"
    final artist = track.madihDetails?.name ?? track.madih;
    final subtitle = track.rawi != null ? '$artist \u00B7 ${track.rawi!.name}' : artist;

    return Material(
      color: isCurrentTrack
          ? RannaTheme.accent.withValues(alpha: 0.08)
          : Colors.transparent,
      child: InkWell(
        onTap: () {
          Haptics.selection();
          // Resolve queue: explicit param > inherited scope > single-track.
          final tracksToCache =
              queue ?? TrackQueueScope.of(context)?.tracks ?? [track];
          ref.read(trackCacheProvider.notifier).state = {
            ...ref.read(trackCacheProvider),
            for (final t in tracksToCache) t.id: t,
          };
          ref.read(audioPlayerProvider.notifier).playTrack(
                track.id,
                queue: tracksToCache.map((t) => t.id).toList(),
              );
          onTap?.call();
        },
        // Long-press → bottom sheet with "Play next" + "Add to queue".
        onLongPress: () => showTrackActionSheet(context, ref, track),
        child: SizedBox(
          height: scaleForTablet(context, 56, 68),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Row(
              children: [
                // 1. Track number or equalizer bars
                SizedBox(
                  width: 20,
                  child: Center(
                    child: isCurrentAndPlaying
                        ? const _EqualizerBars()
                        : Text(
                            toArabicNum(index + 1),
                            style: TextStyle(
                              fontFamily: RannaTheme.fontFustat,
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: RannaTheme.mutedForeground.withValues(alpha: 0.5),
                              fontFeatures: const [FontFeature.tabularFigures()],
                            ),
                            textAlign: TextAlign.center,
                          ),
                  ),
                ),
                const SizedBox(width: 10),

                // 2. Thumbnail
                ClipRRect(
                  borderRadius: BorderRadius.circular(RannaTheme.radiusSm),
                  child: RannaImage(
                    url: track.resolvedImageUrl,
                    width: 40,
                    height: 40,
                  ),
                ),
                const SizedBox(width: 10),

                // 3. Title and subtitle
                Expanded(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        track.title,
                        style: TextStyle(
                          fontFamily: RannaTheme.fontFustat,
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: isCurrentTrack
                              ? RannaTheme.accent
                              : RannaTheme.foreground,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        subtitle,
                        style: const TextStyle(
                          fontFamily: RannaTheme.fontFustat,
                          fontSize: 11,
                          color: RannaTheme.mutedForeground,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 4),

                // 4. Lyrics indicator
                if (track.lyrics != null && track.lyrics!.isNotEmpty)
                  Padding(
                    padding: const EdgeInsetsDirectional.only(end: 4),
                    child: Icon(
                      Icons.menu_book_rounded,
                      size: 13,
                      color: RannaTheme.mutedForeground.withValues(alpha: 0.3),
                    ),
                  ),

                // 5. Duration
                Text(
                  formatDuration(track.durationSeconds),
                  style: TextStyle(
                    fontFamily: RannaTheme.fontFustat,
                    fontSize: 11,
                    color: RannaTheme.mutedForeground.withValues(alpha: 0.5),
                    fontFeatures: const [FontFeature.tabularFigures()],
                  ),
                ),
                const SizedBox(width: 4),

                // 5. Heart button
                SizedBox(
                  width: 32,
                  height: 32,
                  child: IconButton(
                    onPressed: () {
                      // Heavier tick when *adding* a favorite, light tick
                      // on remove — matches user mental model of "saving"
                      // vs "undoing".
                      isFav ? Haptics.selection() : Haptics.light();
                      ref.read(favoritesProvider.notifier).toggle(track.id);
                    },
                    padding: EdgeInsets.zero,
                    icon: Icon(
                      isFav
                          ? Icons.favorite_rounded
                          : Icons.favorite_border_rounded,
                      size: 18,
                      color: isFav
                          ? RannaTheme.favoriteHeart
                          : RannaTheme.mutedForeground.withValues(alpha: 0.3),
                    ),
                    style: IconButton.styleFrom(
                      shape: const CircleBorder(),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// Animated equalizer bars
class _EqualizerBars extends StatefulWidget {
  const _EqualizerBars();

  @override
  State<_EqualizerBars> createState() => _EqualizerBarsState();
}

class _EqualizerBarsState extends State<_EqualizerBars>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final List<Animation<double>> _barAnimations;

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
