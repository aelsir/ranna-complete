import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:ranna/theme/app_theme.dart';
import 'package:ranna/models/madha.dart';
import 'package:ranna/providers/supabase_providers.dart';
import 'package:ranna/providers/favorites_provider.dart';
import 'package:ranna/providers/download_provider.dart';
import 'package:ranna/components/track/track_row.dart';
import 'package:ranna/components/track/download_button.dart';
import 'package:ranna/components/common/shimmer_loading.dart';

class FavoritesScreen extends ConsumerWidget {
  const FavoritesScreen({super.key});

  String _formatStorageSize(int bytes) {
    if (bytes < 1024) return '$bytes بايت';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(0)} كيلو';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} ميغا';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final favoriteIds = ref.watch(favoritesProvider);
    final favoriteTracks = ref.watch(favoriteTracksProvider);
    final downloadedIds = ref.watch(downloadedTrackIdsProvider);
    final downloadedTracks = ref.watch(downloadedTracksProvider);
    final storageUsed = ref.watch(downloadStorageProvider);

    final hasFavorites = favoriteIds.isNotEmpty;
    final hasDownloads = downloadedIds.isNotEmpty;
    final isEmpty = !hasFavorites && !hasDownloads;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Title ──
          Padding(
            padding: const EdgeInsetsDirectional.fromSTEB(20, 20, 20, 8),
            child: Text(
              'محفوظاتي',
              style: TextStyle(
                fontFamily: RannaTheme.fontFustat,
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: RannaTheme.foreground,
              ),
            ),
          ),

          // ── Content ──
          Expanded(
            child: isEmpty
                ? _buildEmptyState()
                : CustomScrollView(
                    slivers: [
                      // ─── Favorites Section ───
                      if (hasFavorites) ...[
                        SliverToBoxAdapter(
                          child: _SectionHeader(
                            icon: Icons.favorite_rounded,
                            iconColor: RannaTheme.favoriteHeart,
                            title: 'المفضلة',
                            count: favoriteIds.length,
                          ),
                        ),
                        favoriteTracks.when(
                          loading: () => SliverList(
                            delegate: SliverChildBuilderDelegate(
                              (_, _) => const ShimmerTrackRow(),
                              childCount: 4,
                            ),
                          ),
                          error: (_, _) => SliverToBoxAdapter(
                            child: _buildErrorMessage(
                              'حدث خطأ في تحميل المفضلة',
                            ),
                          ),
                          data: (tracks) => SliverList(
                            delegate: SliverChildBuilderDelegate((
                              context,
                              index,
                            ) {
                              final track = tracks[index];
                              return Padding(
                                    padding:
                                        const EdgeInsetsDirectional.fromSTEB(
                                          8,
                                          0,
                                          8,
                                          0,
                                        ),
                                    child: Column(
                                      children: [
                                        Row(
                                          children: [
                                            Expanded(
                                              child: TrackRow(
                                                track: track,
                                                index: index,
                                                queue: tracks,
                                              ),
                                            ),
                                            DownloadButton(track: track),
                                            const SizedBox(width: 4),
                                          ],
                                        ),
                                        if (index < tracks.length - 1)
                                          Divider(
                                            height: 1,
                                            indent: 72,
                                            color: RannaTheme.border.withValues(
                                              alpha: 0.3,
                                            ),
                                          ),
                                      ],
                                    ),
                                  )
                                  .animate()
                                  .fadeIn(
                                    duration: 250.ms,
                                    delay: Duration(milliseconds: 20 * index),
                                  )
                                  .slideX(
                                    begin: 0.03,
                                    end: 0,
                                    duration: 250.ms,
                                    delay: Duration(milliseconds: 20 * index),
                                    curve: Curves.easeOut,
                                  );
                            }, childCount: tracks.length),
                          ),
                        ),
                      ],

                      // ─── Downloads Section ───
                      if (hasDownloads) ...[
                        SliverToBoxAdapter(
                          child: _SectionHeader(
                            icon: Icons.download_done_rounded,
                            iconColor: RannaTheme.accent,
                            title: 'المحفوظة محلياً',
                            count: downloadedIds.length,
                            trailing: storageUsed.when(
                              data: (bytes) => Text(
                                _formatStorageSize(bytes),
                                style: TextStyle(
                                  fontFamily: RannaTheme.fontFustat,
                                  fontSize: 11,
                                  color: RannaTheme.mutedForeground,
                                ),
                              ),
                              loading: () => const SizedBox.shrink(),
                              error: (_, _) => const SizedBox.shrink(),
                            ),
                          ),
                        ),
                        downloadedTracks.when(
                          loading: () => SliverList(
                            delegate: SliverChildBuilderDelegate(
                              (_, _) => const ShimmerTrackRow(),
                              childCount: 3,
                            ),
                          ),
                          error: (_, _) => SliverToBoxAdapter(
                            child: _buildErrorMessage(
                              'حدث خطأ في تحميل المحفوظات',
                            ),
                          ),
                          data: (rows) {
                            // Pre-decode the JSON metadata for every row once
                            // so all TrackRow children share the same queue
                            // identity (auto-advance plays them in order).
                            final downloadedTracks = rows
                                .map(
                                  (r) => MadhaWithRelations.fromJson(
                                    jsonDecode(r.metadataJson)
                                        as Map<String, dynamic>,
                                  ),
                                )
                                .toList();
                            return SliverList(
                              delegate: SliverChildBuilderDelegate((
                                context,
                                index,
                              ) {
                                final row = rows[index];
                                final track = downloadedTracks[index];
                                return Dismissible(
                                  key: Key('download-${row.trackId}'),
                                  direction: DismissDirection.endToStart,
                                  background: Container(
                                    alignment: Alignment.centerLeft,
                                    padding: const EdgeInsets.only(left: 24),
                                    color: Colors.red.shade700,
                                    child: const Icon(
                                      Icons.delete_rounded,
                                      color: Colors.white,
                                    ),
                                  ),
                                  confirmDismiss: (_) async {
                                    return await showDialog<bool>(
                                      context: context,
                                      builder: (ctx) => Directionality(
                                        textDirection: TextDirection.rtl,
                                        child: AlertDialog(
                                          title: const Text(
                                            'حذف المحفوظة',
                                            style: TextStyle(
                                              fontFamily: RannaTheme.fontKufam,
                                            ),
                                          ),
                                          content: Text(
                                            'هل تريد حذف "${track.title}" من المحفوظات المحلية؟',
                                            style: const TextStyle(
                                              fontFamily:
                                                  RannaTheme.fontReadexPro,
                                            ),
                                          ),
                                          actions: [
                                            TextButton(
                                              onPressed: () =>
                                                  Navigator.pop(ctx, false),
                                              child: const Text(
                                                'إلغاء',
                                                style: TextStyle(
                                                  fontFamily:
                                                      RannaTheme.fontKufam,
                                                ),
                                              ),
                                            ),
                                            TextButton(
                                              onPressed: () =>
                                                  Navigator.pop(ctx, true),
                                              child: Text(
                                                'حذف',
                                                style: TextStyle(
                                                  fontFamily:
                                                      RannaTheme.fontKufam,
                                                  color: Colors.red.shade700,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    );
                                  },
                                  onDismissed: (_) =>
                                      removeDownload(ref, row.trackId),
                                  child: Padding(
                                    padding:
                                        const EdgeInsetsDirectional.fromSTEB(
                                          8,
                                          0,
                                          8,
                                          0,
                                        ),
                                    child: Column(
                                      children: [
                                        Row(
                                          children: [
                                            Expanded(
                                              child: TrackRow(
                                                track: track,
                                                index: index,
                                                queue: downloadedTracks,
                                              ),
                                            ),
                                            Icon(
                                              Icons.check_circle_rounded,
                                              size: 18,
                                              color: RannaTheme.accent,
                                            ),
                                            const SizedBox(width: 4),
                                            Text(
                                              _formatStorageSize(
                                                row.fileSizeBytes,
                                              ),
                                              style: TextStyle(
                                                fontFamily:
                                                    RannaTheme.fontFustat,
                                                fontSize: 10,
                                                color: RannaTheme
                                                    .mutedForeground
                                                    .withValues(alpha: 0.5),
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                          ],
                                        ),
                                        if (index < rows.length - 1)
                                          Divider(
                                            height: 1,
                                            indent: 72,
                                            color: RannaTheme.border.withValues(
                                              alpha: 0.3,
                                            ),
                                          ),
                                      ],
                                    ),
                                  ),
                                );
                              }, childCount: rows.length),
                            );
                          },
                        ),

                        // Delete all button
                        SliverToBoxAdapter(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 20,
                              vertical: 16,
                            ),
                            child: OutlinedButton.icon(
                              onPressed: () async {
                                final confirmed = await showDialog<bool>(
                                  context: context,
                                  builder: (ctx) => Directionality(
                                    textDirection: TextDirection.rtl,
                                    child: AlertDialog(
                                      title: const Text(
                                        'حذف جميع المحفوظات',
                                        style: TextStyle(
                                          fontFamily: RannaTheme.fontKufam,
                                        ),
                                      ),
                                      content: Text(
                                        'سيتم حذف ${downloadedIds.length} مقطع محفوظة محلياً. لن يتم حذفها من المفضلة.',
                                        style: const TextStyle(
                                          fontFamily: RannaTheme.fontReadexPro,
                                        ),
                                      ),
                                      actions: [
                                        TextButton(
                                          onPressed: () =>
                                              Navigator.pop(ctx, false),
                                          child: const Text(
                                            'إلغاء',
                                            style: TextStyle(
                                              fontFamily: RannaTheme.fontKufam,
                                            ),
                                          ),
                                        ),
                                        TextButton(
                                          onPressed: () =>
                                              Navigator.pop(ctx, true),
                                          child: Text(
                                            'حذف الكل',
                                            style: TextStyle(
                                              fontFamily: RannaTheme.fontKufam,
                                              color: Colors.red.shade700,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                                if (confirmed == true) {
                                  await removeAllDownloads(ref);
                                }
                              },
                              icon: Icon(
                                Icons.delete_outline_rounded,
                                size: 16,
                                color: Colors.red.shade400,
                              ),
                              label: Text(
                                'حذف جميع المحفوظات',
                                style: TextStyle(
                                  fontFamily: RannaTheme.fontFustat,
                                  fontSize: 12,
                                  color: Colors.red.shade400,
                                ),
                              ),
                              style: OutlinedButton.styleFrom(
                                side: BorderSide(
                                  color: Colors.red.shade200.withValues(
                                    alpha: 0.3,
                                  ),
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(
                                    RannaTheme.radiusLg,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],

                      // Bottom padding
                      const SliverToBoxAdapter(child: SizedBox(height: 120)),
                    ],
                  ),
          ),
        ],
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
                  Icons.favorite_rounded,
                  size: 72,
                  color: RannaTheme.favoriteHeart.withValues(alpha: 0.3),
                )
                .animate(onPlay: (controller) => controller.repeat())
                .moveY(
                  begin: 0,
                  end: -8,
                  duration: 1500.ms,
                  curve: Curves.easeInOut,
                )
                .then()
                .moveY(
                  begin: -8,
                  end: 0,
                  duration: 1500.ms,
                  curve: Curves.easeInOut,
                ),
            const SizedBox(height: 24),
            Text(
              'لم تقم بتفضيل أي مقطع بعد',
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
              'اضغط على أيقونة القلب في أي مقطع\nلإضافتها إلى مختاراتك',
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

  Widget _buildErrorMessage(String text) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Center(
        child: Text(
          text,
          style: TextStyle(
            fontFamily: RannaTheme.fontNotoNaskh,
            fontSize: 14,
            color: RannaTheme.mutedForeground,
          ),
        ),
      ),
    );
  }
}

/// Section header with icon, title, count badge, and optional trailing widget.
class _SectionHeader extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String title;
  final int count;
  final Widget? trailing;

  const _SectionHeader({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.count,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsetsDirectional.fromSTEB(20, 16, 20, 8),
      child: Row(
        children: [
          Icon(icon, size: 16, color: iconColor),
          const SizedBox(width: 6),
          Text(
            title,
            style: TextStyle(
              fontFamily: RannaTheme.fontFustat,
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: RannaTheme.foreground,
            ),
          ),
          const SizedBox(width: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
            decoration: BoxDecoration(
              color: RannaTheme.accent.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(RannaTheme.radiusFull),
            ),
            child: Text(
              '$count',
              style: const TextStyle(
                fontFamily: RannaTheme.fontFustat,
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: RannaTheme.accent,
              ),
            ),
          ),
          const Spacer(),
          ?trailing,
        ],
      ),
    );
  }
}
