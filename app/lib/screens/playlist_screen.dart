import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:ranna/components/common/ranna_image.dart';
import 'package:ranna/components/common/shimmer_loading.dart';
import 'package:ranna/components/track/play_all_button.dart';
import 'package:ranna/components/track/track_row.dart';
import 'package:ranna/models/madha.dart';
import 'package:ranna/providers/supabase_providers.dart';
import 'package:ranna/theme/app_theme.dart';
import 'package:ranna/utils/format.dart';

/// Collection/playlist detail page.
///
/// Displays a hero cover image with the collection name, a play button
/// with glow accent shadow, optional description, and a scrollable
/// list of tracks belonging to the collection.
class PlaylistScreen extends ConsumerWidget {
  final String id;

  const PlaylistScreen({super.key, required this.id});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(collectionDetailProvider(id));
    final tracksAsync = ref.watch(collectionTracksProvider(id));

    return Scaffold(
      backgroundColor: RannaTheme.background,
      body: detailAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, _) => Center(
          child: Text(
            'حدث خطأ',
            style: Theme.of(context).textTheme.titleMedium,
          ),
        ),
        data: (collection) {
          if (collection == null) {
            return Center(
              child: Text(
                'حدث خطأ',
                style: Theme.of(context).textTheme.titleMedium,
              ),
            );
          }

          final imageUrl = getImageUrl(collection.imageUrl);

          return tracksAsync.when(
            loading: () => CustomScrollView(
              slivers: [
                _buildAppBar(context, collection.name, imageUrl),
                SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (_, _) => const ShimmerTrackRow(),
                    childCount: 8,
                  ),
                ),
              ],
            ),
            error: (_, _) => Center(
              child: Text(
                'حدث خطأ',
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ),
            data: (tracks) => _buildBody(
              context,
              ref,
              collection.name,
              collection.description,
              imageUrl,
              tracks,
            ),
          );
        },
      ),
    );
  }

  SliverAppBar _buildAppBar(
    BuildContext context,
    String name,
    String imageUrl,
  ) {
    return SliverAppBar(
      expandedHeight: 288,
      pinned: true,
      backgroundColor: RannaTheme.background,
      leading: Padding(
        padding: const EdgeInsets.all(8.0),
        child: GestureDetector(
          onTap: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/');
            }
          },
          child: Container(
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
        ),
      ),
      flexibleSpace: FlexibleSpaceBar(
        centerTitle: false,
        titlePadding: const EdgeInsetsDirectional.only(
          start: 64,
          bottom: 16,
          end: 16,
        ),
        title: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'قائمة تشغيل',
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.7),
                fontSize: 10,
                fontWeight: FontWeight.w400,
              ),
            ),
            Text(
              name,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
        background: Stack(
          fit: StackFit.expand,
          children: [
            if (imageUrl.isNotEmpty)
              RannaImage(
                url: imageUrl,
                width: double.infinity,
                height: 288,
                fit: BoxFit.cover,
                fallbackWidget: Container(color: RannaTheme.primary),
              )
            else
              Container(color: RannaTheme.primary),
            Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.bottomCenter,
                  end: Alignment.topCenter,
                  stops: const [0.0, 0.45, 1.0],
                  colors: [
                    RannaTheme.background,
                    RannaTheme.background.withValues(alpha: 0.3),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBody(
    BuildContext context,
    WidgetRef ref,
    String name,
    String? description,
    String imageUrl,
    List<MadhaWithRelations> tracks,
  ) {
    return CustomScrollView(
      slivers: [
        _buildAppBar(context, name, imageUrl),

        // Action row
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsetsDirectional.symmetric(
              horizontal: 16,
              vertical: 12,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    PlayAllButton.pill(tracks: tracks),
                    const SizedBox(width: 12),
                    Text(
                      '${toArabicNum(tracks.length)} مدحة',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: RannaTheme.mutedForeground,
                      ),
                    ),
                  ],
                ),
                if (description != null && description.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Text(
                    description,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: RannaTheme.mutedForeground,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),

        // Track list
        SliverList(
          delegate: SliverChildBuilderDelegate(
            (context, index) =>
                TrackRow(track: tracks[index], index: index, queue: tracks),
            childCount: tracks.length,
          ),
        ),

        // Bottom padding for mini player + nav bar
        const SliverToBoxAdapter(child: SizedBox(height: 120)),
      ],
    );
  }

}
