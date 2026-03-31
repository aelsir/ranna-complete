import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/madha.dart';
import '../../providers/download_provider.dart';
import '../../theme/app_theme.dart';

/// Compact download button for a track.
///
/// States:
/// 1. Not downloaded: download icon (+ optional file size)
/// 2. Downloading: circular progress with accent color
/// 3. Downloaded: green checkmark
class DownloadButton extends ConsumerWidget {
  final MadhaWithRelations track;
  final double iconSize;

  const DownloadButton({
    super.key,
    required this.track,
    this.iconSize = 20,
  });

  String _formatSize(int bytes) {
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(0)} كيلو';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} ميغا';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final downloadedIds = ref.watch(downloadedTrackIdsProvider);
    final activeDownloads = ref.watch(activeDownloadsProvider);
    final isDownloaded = downloadedIds.contains(track.id);
    final progress = activeDownloads[track.id];
    final isDownloading = progress != null;

    // ── Downloaded ──
    if (isDownloaded) {
      return SizedBox(
        width: 32,
        height: 32,
        child: Icon(
          Icons.check_circle_rounded,
          color: RannaTheme.accent,
          size: iconSize,
        ),
      );
    }

    // ── Downloading ──
    if (isDownloading) {
      return GestureDetector(
        onTap: () {
          // Cancel the download
          ref.read(downloadServiceProvider).cancelDownload(track.id);
          ref.read(activeDownloadsProvider.notifier).remove(track.id);
        },
        child: SizedBox(
          width: 32,
          height: 32,
          child: Stack(
            alignment: Alignment.center,
            children: [
              SizedBox(
                width: iconSize,
                height: iconSize,
                child: CircularProgressIndicator(
                  value: progress > 0 ? progress : null,
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation(RannaTheme.accent),
                  backgroundColor: RannaTheme.muted.withValues(alpha: 0.3),
                ),
              ),
              Icon(
                Icons.close,
                size: iconSize * 0.5,
                color: RannaTheme.mutedForeground,
              ),
            ],
          ),
        ),
      );
    }

    // ── Not Downloaded ──
    return GestureDetector(
      onTap: () => _startDownload(context, ref),
      child: SizedBox(
        width: 32,
        height: 44,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.download_rounded,
              size: iconSize,
              color: RannaTheme.mutedForeground.withValues(alpha: 0.6),
            ),
            if (track.fileSizeBytes != null && track.fileSizeBytes! > 0)
              Padding(
                padding: const EdgeInsets.only(top: 1),
                child: Text(
                  _formatSize(track.fileSizeBytes!),
                  style: TextStyle(
                    fontSize: 8,
                    color: RannaTheme.mutedForeground.withValues(alpha: 0.5),
                    fontFamily: 'Fustat',
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _startDownload(BuildContext context, WidgetRef ref) async {
    try {
      await startDownload(ref, track);
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'فشل التحميل: ${e.toString().substring(0, 50.clamp(0, e.toString().length))}',
              style: const TextStyle(fontFamily: 'Fustat'),
            ),
            backgroundColor: Colors.red.shade700,
          ),
        );
      }
    }
  }
}
