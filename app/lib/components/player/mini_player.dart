import 'dart:math' as math;
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:ranna/models/madha.dart';
import 'package:ranna/providers/favorites_provider.dart';
import 'package:ranna/providers/download_provider.dart';
import 'package:ranna/services/audio_player_service.dart';
import 'package:ranna/theme/app_theme.dart';

/// Redesigned mini player bar with swipe-to-dismiss:
///
///   [Play/Pause]  |  Title / Artist  |  [Lyrics?] [Share] [Love]
///
/// Swipe left to reveal a red "clear" action that dismisses the player.
class MiniPlayer extends ConsumerStatefulWidget {
  const MiniPlayer({super.key});

  @override
  ConsumerState<MiniPlayer> createState() => _MiniPlayerState();
}

class _MiniPlayerState extends ConsumerState<MiniPlayer> {
  // How far the player has been dragged open (0 = closed, _actionWidth = fully open)
  double _dragExtent = 0;
  static const _actionWidth = 72.0;

  @override
  void initState() {
    super.initState();
  }

  void _onDragUpdate(DragUpdateDetails details) {
    // In RTL layout, swiping left produces negative primaryDelta.
    // We track _dragExtent as positive (0 = closed, _actionWidth = open).
    setState(() {
      _dragExtent -= details.primaryDelta ?? 0; // negate: left swipe → increase
      _dragExtent = _dragExtent.clamp(0.0, _actionWidth);
    });
  }

  void _onDragEnd(DragEndDetails details) {
    if (_dragExtent > _actionWidth * 0.4) {
      // Snap open
      setState(() => _dragExtent = _actionWidth);
    } else {
      // Snap closed
      setState(() => _dragExtent = 0);
    }
  }

  void _dismiss() {
    ref.read(audioPlayerProvider.notifier).stopAndClear();
  }

  @override
  Widget build(BuildContext context) {
    final track = ref.watch(currentTrackProvider);

    if (track == null) return const SizedBox.shrink();

    final isPlaying = ref.watch(isPlayingProvider);
    final progress = ref.watch(audioPlayerProvider.select((s) => s.progress));
    final notifier = ref.read(audioPlayerProvider.notifier);
    final isFav = ref.watch(
      favoritesProvider.select((s) => s.contains(track.id)),
    );
    final hasLyrics = track.lyrics != null && track.lyrics!.isNotEmpty;

    return Stack(
      children: [
        // --- Red delete action behind the player ---
        Positioned.fill(
          child: Align(
            alignment: AlignmentDirectional.centerStart,
            child: GestureDetector(
              onTap: _dismiss,
              behavior: HitTestBehavior.opaque,
              child: Container(
                width: _actionWidth,
                decoration: BoxDecoration(
                  color: RannaTheme.destructive.withValues(alpha: 0.30),
                  borderRadius: BorderRadius.circular(RannaTheme.radius3xl),
                ),
                child: const Center(
                  child: Icon(
                    Icons.delete_outline_rounded,
                    color: RannaTheme.destructive,
                    size: 26,
                  ),
                ),
              ),
            ),
          ),
        ),

        // --- Swipeable mini player ---
        AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          curve: Curves.easeOut,
          transform: Matrix4.translationValues(-_dragExtent, 0, 0),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(RannaTheme.radius3xl),
            boxShadow: RannaTheme.shadowFloat,
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(RannaTheme.radius3xl),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
              child: Container(
                decoration: BoxDecoration(
                  color: RannaTheme.card.withValues(alpha: 0.80),
                  borderRadius: BorderRadius.circular(RannaTheme.radius3xl),
                  border: Border.all(color: RannaTheme.border.withValues(alpha: 0.6)),
                ),
                child: GestureDetector(
                  onHorizontalDragUpdate: _onDragUpdate,
                  onHorizontalDragEnd: _onDragEnd,
                  onTap: _dragExtent > 4
                      ? () =>
                            setState(() => _dragExtent = 0)
                      : () => notifier.openFullPlayer(),
                  behavior: HitTestBehavior.opaque,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    child: Row(
                      children: [
                        // --- Right: Play/Pause with circular progress ---
                        GestureDetector(
                          onTap: () => notifier.togglePlay(),
                          child: SizedBox(
                            width: 48,
                            height: 48,
                            child: CustomPaint(
                              painter: _CircularProgressPainter(
                                progress: progress,
                                progressColor: RannaTheme.primary,
                                trackColor: RannaTheme.foreground.withValues(
                                  alpha: 0.10,
                                ),
                                strokeWidth: 6,
                              ),
                              child: Center(
                                child: Container(
                                  width: 26,
                                  height: 26,
                                  decoration: const BoxDecoration(
                                    color: RannaTheme.primary,
                                    shape: BoxShape.circle,
                                  ),
                                  child: Center(
                                    child: Icon(
                                      isPlaying
                                          ? Icons.pause_rounded
                                          : RannaTheme.playIcon,
                                      color: RannaTheme.background,
                                      size: 14,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),

                        const SizedBox(width: 12),

                        // --- Center: Track title + artist ---
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                track.title,
                                style: const TextStyle(
                                  fontFamily: RannaTheme.fontFustat,
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 2),
                              Text(
                                track.madihDetails?.name ?? track.madih,
                                style: TextStyle(
                                  fontFamily: RannaTheme.fontFustat,
                                  fontSize: 11,
                                  color: Colors.white.withValues(alpha: 0.50),
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),

                        const SizedBox(width: 8),

                        // --- Left: Action buttons ---
                        if (hasLyrics)
                          _MiniActionButton(
                            icon: Icons.menu_book_rounded,
                            color: RannaTheme.primaryForeground.withValues(
                              alpha: 0.40,
                            ),
                            onTap: () {
                              notifier.openFullPlayerWithLyrics();
                            },
                          ),
                        _MiniDownloadButton(track: track),
                        _MiniActionButton(
                          icon: isFav
                              ? Icons.favorite_rounded
                              : Icons.favorite_border_rounded,
                          color: isFav
                              ? RannaTheme.favoriteHeart
                              : RannaTheme.primaryForeground.withValues(alpha: 0.40),
                          onTap: () {
                            ref.read(favoritesProvider.notifier).toggle(track.id);
                          },
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

/// Small action button (love, share, lyrics) in the mini player.
class _MiniActionButton extends StatelessWidget {
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _MiniActionButton({
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: SizedBox(
        width: 36,
        height: 36,
        child: Center(child: Icon(icon, size: 22, color: color)),
      ),
    );
  }
}

/// Download button for the mini player — shows icon/progress/checkmark.
class _MiniDownloadButton extends ConsumerWidget {
  final MadhaWithRelations track;
  const _MiniDownloadButton({required this.track});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDownloaded = ref
        .watch(downloadedTrackIdsProvider)
        .contains(track.id);
    final progress = ref.watch(activeDownloadsProvider)[track.id];
    final isDownloading = progress != null;

    if (isDownloaded) {
      return SizedBox(
        width: 36,
        height: 36,
        child: Center(
          child: Icon(
            Icons.check_circle_rounded,
            size: 22,
            color: RannaTheme.accent,
          ),
        ),
      );
    }

    if (isDownloading) {
      return SizedBox(
        width: 36,
        height: 36,
        child: Center(
          child: SizedBox(
            width: 20,
            height: 20,
            child: CircularProgressIndicator(
              value: progress > 0 ? progress : null,
              strokeWidth: 2,
              valueColor: AlwaysStoppedAnimation(RannaTheme.accent),
              backgroundColor: RannaTheme.primaryForeground.withValues(
                alpha: 0.1,
              ),
            ),
          ),
        ),
      );
    }

    return GestureDetector(
      onTap: () async {
        try {
          await startDownload(ref, track);
        } catch (_) {}
      },
      behavior: HitTestBehavior.opaque,
      child: SizedBox(
        width: 36,
        height: 36,
        child: Center(
          child: Icon(
            Icons.download_rounded,
            size: 22,
            color: RannaTheme.primaryForeground.withValues(alpha: 0.40),
          ),
        ),
      ),
    );
  }
}

/// Paints a circular progress arc around the play/pause button.
class _CircularProgressPainter extends CustomPainter {
  final double progress; // 0.0 to 1.0
  final Color progressColor;
  final Color trackColor;
  final double strokeWidth;

  _CircularProgressPainter({
    required this.progress,
    required this.progressColor,
    required this.trackColor,
    required this.strokeWidth,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (math.min(size.width, size.height) / 2) - strokeWidth;

    // Background track
    final trackPaint = Paint()
      ..color = trackColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    canvas.drawCircle(center, radius, trackPaint);

    // Progress arc
    if (progress > 0) {
      final progressPaint = Paint()
        ..color = progressColor
        ..style = PaintingStyle.stroke
        ..strokeWidth = strokeWidth
        ..strokeCap = StrokeCap.round;

      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        -math.pi / 2, // Start from top
        2 *
            math.pi *
            progress, // Positive = clockwise in code; RTL Directionality mirrors it → appears anti-clockwise on screen
        false,
        progressPaint,
      );
    }
  }

  @override
  bool shouldRepaint(_CircularProgressPainter oldDelegate) {
    return oldDelegate.progress != progress;
  }
}
