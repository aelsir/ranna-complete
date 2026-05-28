import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:ranna/components/common/ranna_image.dart';
import 'package:ranna/components/track/track_action_sheet.dart';
import 'package:ranna/components/track/track_queue_scope.dart';
import 'package:ranna/models/madha.dart';
import 'package:ranna/providers/favorites_provider.dart';
import 'package:ranna/services/audio_player_service.dart';
import 'package:ranna/theme/app_theme.dart';
import 'package:ranna/utils/format.dart';
import 'package:ranna/utils/haptics.dart';

/// Horizontally-scrolling track list.
///
/// Implemented as a `ListView.builder` whose items are columns of tracks.
/// To get the "one continuous rounded card" look, only the first column has
/// rounded start-side corners and only the last column has rounded end-side
/// corners — middle columns are flat. Visually adjacent columns share the
/// same background and merge into one card.
///
/// Column width is computed from the parent's actual width (via
/// [LayoutBuilder]) so a configurable peek of the next column is always
/// visible at scroll position 0, signalling that the list scrolls.
class TracksHorizontalCarousel extends StatelessWidget {
  final List<MadhaWithRelations> tracks;

  /// Inset between the carousel and the screen edges (start + end).
  final double horizontalPadding;

  /// Fraction of the viewport width each column occupies. The remainder
  /// (minus leading padding) becomes the peek of the next column.
  final double columnWidthFraction;

  /// Number of tracks to stack vertically in each column.
  final int rowsPerColumn;

  /// The fixed height of a single track row.
  final double trackHeight;

  /// Whether to show horizontal dividers between tracks.
  final bool showDividers;

  /// The thickness/height of the horizontal dividers.
  final double dividerThickness;

  /// The indent and endIndent of the dividers.
  final double dividerIndent;

  /// Custom background color for the carousel container.
  final Color? backgroundColor;

  /// Custom border color for the carousel container.
  final Color? borderColor;

  /// Custom color for the horizontal dividers.
  final Color? dividerColor;

  /// Custom border radius for the carousel container.
  final BorderRadiusGeometry? borderRadius;

  const TracksHorizontalCarousel({
    super.key,
    required this.tracks,
    this.horizontalPadding = 20,
    this.columnWidthFraction = 0.78,
    this.rowsPerColumn = 2,
    this.trackHeight = 72.0,
    this.showDividers = true,
    this.dividerThickness = 1.0,
    this.dividerIndent = 16.0,
    this.backgroundColor,
    this.borderColor,
    this.dividerColor,
    this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    if (tracks.isEmpty) return const SizedBox.shrink();

    final columns = <List<MadhaWithRelations>>[];
    for (var i = 0; i < tracks.length; i += rowsPerColumn) {
      columns.add(
        tracks.sublist(i, (i + rowsPerColumn).clamp(0, tracks.length)),
      );
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        // Viewport width = the screen-wide slot the carousel sits in.
        // Each column takes a fixed fraction of that; whatever's left after
        // the leading padding becomes the peek of the next column.
        final viewportWidth = constraints.maxWidth;
        final columnWidth = viewportWidth * columnWidthFraction;
        
        // Resolve theme colors if custom ones are not provided
        final resolvedRadius = borderRadius ?? BorderRadius.circular(RannaTheme.radius2xl);
        final resolvedBorderColor = borderColor ?? RannaTheme.border.withValues(alpha: 0.3);
        final resolvedDividerColor = dividerColor ?? RannaTheme.border.withValues(alpha: 0.6);
        final resolvedBgColor = backgroundColor ?? RannaTheme.card;

        return TrackQueueScope(
          tracks: tracks,
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            physics: const BouncingScrollPhysics(),
            padding: EdgeInsetsDirectional.only(
              start: horizontalPadding,
              end: horizontalPadding,
            ),
            child: Container(
              // A single container creates the "continuous stretched card" look automatically
              decoration: BoxDecoration(
                color: resolvedBgColor,
                borderRadius: resolvedRadius,
                border: Border.all(color: resolvedBorderColor),
              ),
              clipBehavior: Clip.antiAlias,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: columns.map((colTracks) {
                  final trackWidgets = <Widget>[];

                  for (int j = 0; j < rowsPerColumn; j++) {
                    if (j < colTracks.length) {
                      trackWidgets.add(_CarouselTrackRow(
                        track: colTracks[j],
                        height: trackHeight,
                      ));
                      if (showDividers && j < rowsPerColumn - 1) {
                        trackWidgets.add(
                          Divider(
                            height: dividerThickness,
                            thickness: dividerThickness,
                            indent: dividerIndent,
                            endIndent: dividerIndent,
                            color: resolvedDividerColor,
                          ),
                        );
                      }
                    } else {
                      // Dynamically calculate empty space so the layout doesn't shrink
                      final emptyHeight = (showDividers && j < rowsPerColumn - 1) 
                          ? trackHeight + dividerThickness 
                          : trackHeight;
                      trackWidgets.add(SizedBox(height: emptyHeight));
                    }
                  }

                  return SizedBox(
                    width: columnWidth,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: trackWidgets,
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _CarouselTrackRow extends ConsumerWidget {
  final MadhaWithRelations track;
  final double height;

  const _CarouselTrackRow({
    super.key,
    required this.track,
    this.height = 72.0,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isCurrentTrack =
        ref.watch(audioPlayerProvider.select((s) => s.currentTrackId)) ==
        track.id;
    final isFav = ref.watch(
      favoritesProvider.select((s) => s.contains(track.id)),
    );

    final artist = track.madihDetails?.name ?? track.madih;
    final subtitle = track.rawi != null
        ? '$artist · ${track.rawi!.name}'
        : artist;
    final hasLyrics = track.lyrics != null && track.lyrics!.isNotEmpty;

    return Material(
      color: isCurrentTrack
          ? RannaTheme.accent.withValues(alpha: 0.08)
          : Colors.transparent,
      child: InkWell(
        onTap: () {
          Haptics.selection();
          final scope = TrackQueueScope.of(context);
          final tracksToCache = scope?.tracks ?? [track];
          ref.read(trackCacheProvider.notifier).state = {
            ...ref.read(trackCacheProvider),
            for (final t in tracksToCache) t.id: t,
          };
          ref
              .read(audioPlayerProvider.notifier)
              .playTrack(
                track.id,
                queue: tracksToCache.map((t) => t.id).toList(),
              );
        },
        onLongPress: () => showTrackActionSheet(context, ref, track),
        child: SizedBox(
          height: height,
          child: Padding(
            padding: const EdgeInsetsDirectional.fromSTEB(12, 0, 8, 0),
            child: Row(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(RannaTheme.radiusMd),
                  child: RannaImage(
                    url: track.resolvedImageUrl,
                    width: 48,
                    height: 48,
                  ),
                ),
                const SizedBox(width: 12),

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
                      const SizedBox(height: 2),
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
                      const SizedBox(height: 2),
                      Text(
                        formatDuration(track.durationSeconds),
                        style: TextStyle(
                          fontFamily: RannaTheme.fontFustat,
                          fontSize: 11,
                          color: RannaTheme.mutedForeground.withValues(
                            alpha: 0.6,
                          ),
                          fontFeatures: const [FontFeature.tabularFigures()],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 4),

                if (hasLyrics)
                  Padding(
                    padding: const EdgeInsetsDirectional.only(end: 2),
                    child: Icon(
                      Icons.menu_book_rounded,
                      size: 16,
                      color: RannaTheme.mutedForeground.withValues(alpha: 0.5),
                    ),
                  ),

                SizedBox(
                  width: 32,
                  height: 32,
                  child: IconButton(
                    onPressed: () {
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
                          : RannaTheme.mutedForeground.withValues(alpha: 0.4),
                    ),
                    style: IconButton.styleFrom(shape: const CircleBorder()),
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
