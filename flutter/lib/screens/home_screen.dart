import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ranna/theme/app_theme.dart';
import 'package:ranna/providers/supabase_providers.dart';
import 'package:ranna/components/home/section_header.dart';
import 'package:ranna/components/home/artist_card.dart';
import 'package:ranna/components/home/collection_card.dart';
import 'package:ranna/components/track/track_row.dart';
import 'package:ranna/components/common/shimmer_loading.dart';
import 'package:ranna/models/madha.dart';
import 'package:ranna/utils/format.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final homeData = ref.watch(homeDataProvider);

    return Scaffold(
      backgroundColor: RannaTheme.background,
      body: homeData.when(
        loading: () => _buildLoading(),
        error: (error, stack) => _buildError(context, ref),
        data: (data) => _buildContent(context, data),
      ),
    );
  }

  Widget _buildLoading() {
    return CustomScrollView(
      slivers: [
        SliverAppBar(
          floating: true,
          title: const Text('رنّة'),
          backgroundColor: RannaTheme.primary,
          foregroundColor: Colors.white,
        ),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsetsDirectional.only(start: 16, top: 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Shimmer for featured section
                const SizedBox(height: 16),
                SizedBox(
                  height: 200,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsetsDirectional.only(start: 16),
                    itemCount: 4,
                    separatorBuilder: (_, __) => const SizedBox(width: 12),
                    itemBuilder: (_, __) => const ShimmerCollectionCard(),
                  ),
                ),
                // Shimmer for artists section
                const SizedBox(height: 24),
                SizedBox(
                  height: 100,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsetsDirectional.only(start: 16),
                    itemCount: 5,
                    separatorBuilder: (_, __) => const SizedBox(width: 12),
                    itemBuilder: (_, __) => const ShimmerArtistCard(),
                  ),
                ),
                // Shimmer for track rows
                const SizedBox(height: 24),
                ...List.generate(
                  5,
                  (_) => const Padding(
                    padding: EdgeInsetsDirectional.only(end: 16),
                    child: ShimmerTrackRow(),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildError(BuildContext context, WidgetRef ref) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.error_outline,
            size: 64,
            color: RannaTheme.mutedForeground,
          ),
          const SizedBox(height: 16),
          Text(
            'حدث خطأ',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () => ref.invalidate(homeDataProvider),
            child: const Text('إعادة المحاولة'),
          ),
        ],
      ),
    );
  }

  Widget _buildContent(BuildContext context, HomeData data) {
    return CustomScrollView(
      slivers: [
        SliverAppBar(
          floating: true,
          title: const Text('رنّة'),
          backgroundColor: RannaTheme.primary,
          foregroundColor: Colors.white,
        ),

        // --- Featured tracks ---
        SliverToBoxAdapter(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 16),
              SectionHeader(title: 'المدائح المميزة', onSeeAll: null),
              SizedBox(
                height: 200,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsetsDirectional.only(start: 16),
                  itemCount: data.featuredTracks.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 12),
                  itemBuilder: (context, index) {
                    final track = data.featuredTracks[index];
                    return _buildFeaturedCard(context, track);
                  },
                ),
              ),
            ],
          ),
        ),

        // --- Artists ---
        SliverToBoxAdapter(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 24),
              SectionHeader(
                title: 'المادحين',
                onSeeAll: () => context.push('/artists'),
              ),
              SizedBox(
                height: 100,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsetsDirectional.only(start: 16),
                  itemCount: data.artists.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 12),
                  itemBuilder: (context, index) {
                    final artist = data.artists[index];
                    return ArtistCard(
                      artist: artist,
                      onTap: () => context.push('/artist/${artist.id}'),
                    );
                  },
                ),
              ),
            ],
          ),
        ),

        // --- Playlists / Collections ---
        SliverToBoxAdapter(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 24),
              SectionHeader(
                title: 'قوائم التشغيل',
                onSeeAll: () => context.push('/browse'),
              ),
              SizedBox(
                height: 180,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsetsDirectional.only(start: 16),
                  itemCount: data.collections.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 12),
                  itemBuilder: (context, index) {
                    final collection = data.collections[index];
                    return CollectionCard(
                      collection: collection,
                      onTap: () =>
                          context.push('/playlist/${collection.id}'),
                    );
                  },
                ),
              ),
            ],
          ),
        ),

        // --- Most Listened ---
        SliverToBoxAdapter(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 24),
              SectionHeader(title: 'الأكثر استماعاً', onSeeAll: null),
              Card(
                margin: const EdgeInsetsDirectional.only(start: 16, end: 16),
                color: RannaTheme.card,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  children: data.popularTracks
                      .take(5)
                      .toList()
                      .asMap()
                      .entries
                      .map((entry) => TrackRow(
                            track: entry.value,
                            index: entry.key,
                            queue: data.popularTracks,
                          ))
                      .toList(),
                ),
              ),
            ],
          ),
        ),

        // --- Recently Added ---
        SliverToBoxAdapter(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 24),
              SectionHeader(title: 'أضيفت مؤخراً', onSeeAll: null),
              Padding(
                padding: const EdgeInsetsDirectional.only(start: 16, end: 16),
                child: Column(
                  children: data.recentTracks
                      .asMap()
                      .entries
                      .map((entry) => TrackRow(
                            track: entry.value,
                            index: entry.key,
                            queue: data.recentTracks,
                          ))
                      .toList(),
                ),
              ),
            ],
          ),
        ),

        // --- Bottom padding for mini player + nav bar ---
        const SliverToBoxAdapter(
          child: SizedBox(height: 120),
        ),
      ],
    );
  }

  Widget _buildFeaturedCard(BuildContext context, MadhaWithRelations track) {
    final imageUrl = getImageUrl(track.imageUrl);

    return GestureDetector(
      onTap: () {
        // Track tap handled by player provider
      },
      child: Container(
        width: 160,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          boxShadow: RannaTheme.shadowSm,
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          fit: StackFit.expand,
          children: [
            // Image
            imageUrl.isNotEmpty
                ? Image.network(
                    imageUrl,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      color: RannaTheme.muted,
                      child: const Icon(
                        Icons.music_note,
                        size: 48,
                        color: RannaTheme.mutedForeground,
                      ),
                    ),
                  )
                : Container(
                    color: RannaTheme.muted,
                    child: const Icon(
                      Icons.music_note,
                      size: 48,
                      color: RannaTheme.mutedForeground,
                    ),
                  ),
            // Gradient overlay
            Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.transparent,
                    Colors.black.withValues(alpha: 0.7),
                  ],
                ),
              ),
            ),
            // Title overlay
            Positioned(
              bottom: 12,
              left: 12,
              right: 12,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    track.title,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                        ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (track.madihDetails != null)
                    Text(
                      track.madihDetails!.name,
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            color: Colors.white70,
                          ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
