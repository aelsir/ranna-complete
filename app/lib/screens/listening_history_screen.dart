import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:ranna/components/common/shimmer_loading.dart';
import 'package:ranna/components/track/track_row.dart';
import 'package:ranna/providers/supabase_providers.dart';
import 'package:ranna/theme/app_theme.dart';
import 'package:ranna/utils/format.dart';

/// Per-user listening history. Each row is a distinct play event
/// (`user_plays` row), so replays show as separate entries with their own
/// timestamps. Backed by `fullListeningHistoryProvider`.
class ListeningHistoryScreen extends ConsumerWidget {
  const ListeningHistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final history = ref.watch(fullListeningHistoryProvider);

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: RannaTheme.background,
        body: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
          // ── Header (back button + title) ──
          Padding(
            padding: const EdgeInsetsDirectional.fromSTEB(16, 16, 20, 8),
            child: Row(
              children: [
                _CircleBackButton(),
                const SizedBox(width: 12),
                Text(
                  'سجل الاستماع',
                  style: TextStyle(
                    fontFamily: RannaTheme.fontFustat,
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: RannaTheme.foreground,
                  ),
                ),
              ],
            ),
          ),

          // ── Content ──
          Expanded(
            child: history.when(
              loading: () => ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                itemCount: 6,
                itemBuilder: (_, _) => const ShimmerTrackRow(),
              ),
              error: (e, _) => Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text(
                    'تعذّر تحميل سجل الاستماع',
                    style: TextStyle(
                      fontFamily: RannaTheme.fontNotoNaskh,
                      fontSize: 14,
                      color: RannaTheme.mutedForeground,
                    ),
                  ),
                ),
              ),
              data: (entries) {
                if (entries.isEmpty) return _buildEmptyState();
                final tracks = entries.map((e) => e.track).toList();
                return ListView.separated(
                  padding: const EdgeInsetsDirectional.fromSTEB(8, 4, 8, 120),
                  itemCount: entries.length,
                  separatorBuilder: (_, _) => Divider(
                    height: 1,
                    indent: 72,
                    color: RannaTheme.border.withValues(alpha: 0.3),
                  ),
                  itemBuilder: (context, index) {
                    final entry = entries[index];
                    return Row(
                      children: [
                        Expanded(
                          child: TrackRow(
                            track: entry.track,
                            index: index,
                            queue: tracks,
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsetsDirectional.fromSTEB(
                              0, 0, 12, 0),
                          child: Text(
                            _formatRelativeTime(entry.playedAt),
                            style: TextStyle(
                              fontFamily: RannaTheme.fontNotoNaskh,
                              fontSize: 11,
                              color: RannaTheme.mutedForeground,
                            ),
                          ),
                        ),
                      ],
                    )
                        .animate()
                        .fadeIn(
                          duration: 220.ms,
                          delay: Duration(milliseconds: 18 * index),
                        )
                        .slideX(
                          begin: 0.03,
                          end: 0,
                          duration: 220.ms,
                          delay: Duration(milliseconds: 18 * index),
                          curve: Curves.easeOut,
                        );
                  },
                );
              },
            ),
          ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.history_rounded,
              size: 72,
              color: RannaTheme.mutedForeground.withValues(alpha: 0.3),
            ),
            const SizedBox(height: 24),
            Text(
              'لا يوجد سجل استماع بعد',
              style: TextStyle(
                fontFamily: RannaTheme.fontFustat,
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: RannaTheme.foreground,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'استمع إلى أي مدحة وستظهر هنا',
              style: TextStyle(
                fontFamily: RannaTheme.fontNotoNaskh,
                fontSize: 14,
                color: RannaTheme.mutedForeground,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  String _formatRelativeTime(DateTime when) {
    final now = DateTime.now();
    final diff = now.difference(when);
    if (diff.inMinutes < 1) return 'الآن';
    if (diff.inMinutes < 60) return 'منذ ${toArabicNum(diff.inMinutes)} د';
    if (diff.inHours < 24) return 'منذ ${toArabicNum(diff.inHours)} س';
    if (diff.inDays == 1) return 'أمس';
    if (diff.inDays < 7) return 'منذ ${toArabicNum(diff.inDays)} أيام';
    return '${toArabicNum(when.day)}/${toArabicNum(when.month)}/${toArabicNum(when.year)}';
  }
}

/// Circular back button matching the artist/profile screen pattern.
/// In RTL the right-pointing chevron visually means "back" (toward the
/// reading-direction start).
class _CircleBackButton extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        if (context.canPop()) {
          context.pop();
        } else {
          context.go('/account');
        }
      },
      child: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: RannaTheme.muted.withValues(alpha: 0.8),
        ),
        child: const Icon(
          Icons.keyboard_arrow_right_rounded,
          size: 24,
          color: RannaTheme.foreground,
        ),
      ),
    );
  }
}
