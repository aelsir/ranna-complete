import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:ranna/models/madha.dart';
import 'package:ranna/providers/favorites_provider.dart';
import 'package:ranna/providers/download_provider.dart';
import 'package:ranna/services/audio_player_service.dart';
import 'package:ranna/theme/app_theme.dart';

/// Redesigned mini player bar:
///
///   [Play/Pause]  |  Title / Artist  |  [Lyrics?] [Share] [Love]
///
/// No cover art, no slider, no skip buttons.
/// Circular progress ring around play/pause shows track progress.
class MiniPlayer extends ConsumerWidget {
  const MiniPlayer({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final track = ref.watch(currentTrackProvider);

    if (track == null) return const SizedBox.shrink();

    final isPlaying = ref.watch(isPlayingProvider);
    final progress = ref.watch(audioPlayerProvider.select((s) => s.progress));
    final notifier = ref.read(audioPlayerProvider.notifier);
    final isFav = ref.watch(favoritesProvider.select((s) => s.contains(track.id)));
    final hasLyrics = track.lyrics != null && track.lyrics!.isNotEmpty;

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
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          child: Row(
            children: [
              // --- Right: Play/Pause with circular progress (at start/right in RTL) ---
              GestureDetector(
                onTap: () => notifier.togglePlay(),
                child: SizedBox(
                  width: 44,
                  height: 44,
                  child: CustomPaint(
                    painter: _CircularProgressPainter(
                      progress: progress,
                      progressColor: RannaTheme.accent,
                      trackColor: RannaTheme.primaryForeground.withValues(alpha: 0.10),
                      strokeWidth: 2.5,
                    ),
                    child: Center(
                      child: Container(
                        width: 36,
                        height: 36,
                        decoration: const BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                        ),
                        child: Center(
                          child: Icon(
                            isPlaying ? Icons.pause_rounded : RannaTheme.playIcon,
                            color: RannaTheme.primary,
                            size: 22,
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

              // --- Left: Action buttons (lyrics, download, love) in RTL order ---
              if (hasLyrics)
                _MiniActionButton(
                  icon: Icons.menu_book_rounded,
                  color: RannaTheme.primaryForeground.withValues(alpha: 0.40),
                  onTap: () {
                    notifier.openFullPlayerWithLyrics();
                  },
                ),
              _MiniDownloadButton(track: track),
              _MiniActionButton(
                icon: isFav ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                color: isFav
                    ? RannaTheme.accent
                    : RannaTheme.primaryForeground.withValues(alpha: 0.40),
                onTap: () {
                  ref.read(favoritesProvider.notifier).toggle(track.id);
                },
              ),
            ],
          ),
        ),
      ),
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
        child: Center(
          child: Icon(icon, size: 22, color: color),
        ),
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
    final isDownloaded = ref.watch(downloadedTrackIdsProvider).contains(track.id);
    final progress = ref.watch(activeDownloadsProvider)[track.id];
    final isDownloading = progress != null;

    if (isDownloaded) {
      return SizedBox(
        width: 36,
        height: 36,
        child: Center(
          child: Icon(Icons.check_circle_rounded, size: 22, color: RannaTheme.accent),
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
              backgroundColor: RannaTheme.primaryForeground.withValues(alpha: 0.1),
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
        -2 * math.pi * progress, // Fill counter-clockwise for RTL
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
