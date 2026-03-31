import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:ranna/theme/app_theme.dart';
import 'package:ranna/models/madha.dart';
import 'package:ranna/providers/supabase_providers.dart';
import 'package:ranna/providers/favorites_provider.dart';
import 'package:ranna/components/track/track_row.dart';
import 'package:ranna/components/common/shimmer_loading.dart';

class FavoritesScreen extends ConsumerWidget {
  const FavoritesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final favoriteIds = ref.watch(favoritesProvider);
    final favoriteTracks = ref.watch(favoriteTracksProvider);

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Title + count
          Padding(
            padding: const EdgeInsetsDirectional.fromSTEB(20, 20, 20, 16),
            child: Row(
              children: [
                Text(
                  'المختارات',
                  style: TextStyle(
                    fontFamily: RannaTheme.fontFustat,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: RannaTheme.foreground,
                  ),
                ),
                if (favoriteIds.isNotEmpty) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: RannaTheme.accent.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(
                        RannaTheme.radiusFull,
                      ),
                    ),
                    child: Text(
                      '${favoriteIds.length}',
                      style: const TextStyle(
                        fontFamily: RannaTheme.fontFustat,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: RannaTheme.accent,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),

          // Content
          Expanded(
            child: favoriteIds.isEmpty
                ? _buildEmptyState()
                : favoriteTracks.when(
                    loading: () => ListView(
                      padding: const EdgeInsetsDirectional.fromSTEB(4, 0, 4, 0),
                      children: List.generate(
                        6,
                        (_) => const ShimmerTrackRow(),
                      ),
                    ),
                    error: (_, _) => _buildErrorState(),
                    data: (tracks) => tracks.isEmpty
                        ? _buildEmptyState()
                        : _buildTrackList(tracks),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildTrackList(List<MadhaWithRelations> tracks) {
    return ListView.separated(
      padding: const EdgeInsetsDirectional.fromSTEB(8, 0, 8, 100),
      itemCount: tracks.length,
      separatorBuilder: (_, _) => Divider(
        height: 1,
        indent: 72,
        color: RannaTheme.border.withValues(alpha: 0.3),
      ),
      itemBuilder: (context, index) {
        return TrackRow(track: tracks[index], index: index, queue: tracks)
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
      },
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Bobbing heart icon
            Icon(
                  Icons.favorite_rounded,
                  size: 72,
                  color: RannaTheme.accent.withValues(alpha: 0.3),
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
              'لم تقم بتفضيل أي مدحة بعد',
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
              'اضغط على أيقونة القلب في أي مدحة\nلإضافتها إلى مختاراتك',
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

  Widget _buildErrorState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.error_outline_rounded,
            size: 64,
            color: RannaTheme.mutedForeground.withValues(alpha: 0.4),
          ),
          const SizedBox(height: 16),
          Text(
            'حدث خطأ في تحميل المختارات',
            style: TextStyle(
              fontFamily: RannaTheme.fontNotoNaskh,
              fontSize: 16,
              color: RannaTheme.mutedForeground,
            ),
          ),
        ],
      ),
    );
  }
}
