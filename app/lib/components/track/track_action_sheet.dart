import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:ranna/components/common/ranna_image.dart';
import 'package:ranna/models/madha.dart';
import 'package:ranna/services/audio_player_service.dart';
import 'package:ranna/theme/app_theme.dart';

/// Long-press a [TrackRow] → opens this sheet → user can Play Next or
/// Add to Queue without disturbing the current playback or list context.
///
/// The sheet itself is a thin presentation layer; the actual queue
/// mutation logic lives on `AudioPlayerService.enqueueNext` /
/// `enqueueLast`.
///
/// To open from any widget (with a `BuildContext` and a `WidgetRef`):
///
/// ```dart
/// onLongPress: () => showTrackActionSheet(context, ref, track);
/// ```
Future<void> showTrackActionSheet(
  BuildContext context,
  WidgetRef ref,
  MadhaWithRelations track,
) async {
  // Light haptic on long-press → matches platform conventions and gives
  // tactile confirmation that the gesture registered.
  HapticFeedback.lightImpact();

  await showModalBottomSheet<void>(
    context: context,
    backgroundColor: Colors.transparent,
    barrierColor: Colors.black.withValues(alpha: 0.55),
    isScrollControlled: false,
    builder: (sheetContext) => _TrackActionSheet(track: track, parentRef: ref),
  );
}

class _TrackActionSheet extends StatelessWidget {
  final MadhaWithRelations track;
  final WidgetRef parentRef;

  const _TrackActionSheet({required this.track, required this.parentRef});

  @override
  Widget build(BuildContext context) {
    final artist = track.madihDetails?.name ?? track.madih;
    final subtitle = track.rawi != null ? '$artist · ${track.rawi!.name}' : artist;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: SafeArea(
        top: false,
        child: Container(
          decoration: const BoxDecoration(
            color: RannaTheme.card,
            borderRadius: BorderRadius.vertical(
              top: Radius.circular(RannaTheme.radius2xl),
            ),
            border: Border(
              top: BorderSide(color: RannaTheme.border),
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Drag-handle pill (iOS / Material both use this signal).
              Padding(
                padding: const EdgeInsets.only(top: 12, bottom: 4),
                child: Container(
                  width: 36,
                  height: 4,
                  decoration: BoxDecoration(
                    color: RannaTheme.mutedForeground.withValues(alpha: 0.4),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),

              // Track-preview header — disambiguates which track is being
              // acted on, especially in dense lists where long-press
              // targets can be off by a row.
              Padding(
                padding: const EdgeInsetsDirectional.fromSTEB(20, 16, 20, 12),
                child: Row(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(RannaTheme.radiusLg),
                      child: RannaImage(
                        url: track.resolvedImageUrl,
                        width: 48,
                        height: 48,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            track.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontFamily: RannaTheme.fontKufam,
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: RannaTheme.foreground,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            subtitle,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontFamily: RannaTheme.fontReadexPro,
                              fontSize: 12,
                              color: RannaTheme.mutedForeground,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              Divider(
                height: 1,
                color: RannaTheme.border.withValues(alpha: 0.6),
              ),

              // Action: Play next
              _SheetAction(
                icon: Icons.queue_play_next_rounded,
                label: 'تشغيل التالي',
                onTap: () => _onPlayNext(context),
              ),

              // Action: Add to queue
              _SheetAction(
                icon: Icons.queue_music_rounded,
                label: 'إضافة إلى الانتظار',
                onTap: () => _onEnqueueLast(context),
              ),

              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }

  void _onPlayNext(BuildContext sheetContext) {
    HapticFeedback.selectionClick();
    final notifier = parentRef.read(audioPlayerProvider.notifier);
    final wasEmpty = parentRef.read(audioPlayerProvider).queue.isEmpty;
    notifier.enqueueNext(track);
    Navigator.of(sheetContext).pop();
    // No snackbar when starting fresh playback — the play state IS the
    // feedback. Only confirm when we genuinely queued something invisible.
    if (!wasEmpty) {
      _toast(parentRef.context, 'ستُشغَّل تاليًا');
    }
  }

  void _onEnqueueLast(BuildContext sheetContext) {
    HapticFeedback.selectionClick();
    final notifier = parentRef.read(audioPlayerProvider.notifier);
    final wasEmpty = parentRef.read(audioPlayerProvider).queue.isEmpty;
    notifier.enqueueLast(track);
    Navigator.of(sheetContext).pop();
    if (!wasEmpty) {
      _toast(parentRef.context, 'أُضيفت إلى الانتظار');
    }
  }

  /// Floating snackbar matching the rest of the app's confirmation toasts
  /// (account-screen notification toggle, edit-profile save, etc.).
  void _toast(BuildContext context, String message) {
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          message,
          style: const TextStyle(fontFamily: RannaTheme.fontKufam),
          textDirection: TextDirection.rtl,
        ),
        duration: const Duration(seconds: 2),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}

/// One row in the action sheet — icon + label with a generous tap target.
class _SheetAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _SheetAction({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsetsDirectional.fromSTEB(20, 14, 20, 14),
        child: Row(
          children: [
            Icon(icon, size: 22, color: RannaTheme.foreground),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                label,
                style: const TextStyle(
                  fontFamily: RannaTheme.fontKufam,
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: RannaTheme.foreground,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
