import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ranna/components/common/shimmer_loading.dart';
import 'package:ranna/components/home/artist_card.dart';
import 'package:ranna/components/home/collection_card.dart';
import 'package:ranna/components/home/section_header.dart';
import 'package:ranna/components/track/track_row.dart';
import 'package:ranna/models/madha.dart';
import 'package:ranna/models/rawi.dart';
import 'package:ranna/providers/supabase_providers.dart';
import 'package:ranna/services/audio_player_service.dart';
import 'package:ranna/theme/app_theme.dart';
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
        error: (error, stack) => _buildError(context, ref, error),
        data: (data) => _buildContent(context, ref, data),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  Widget _buildLoading() {
    return CustomScrollView(
      slivers: [
        _buildAppBar(null),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const ShimmerBox(width: double.infinity, height: 220, borderRadius: 20),
                const SizedBox(height: 24),
                SizedBox(
                  height: 100,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: 4,
                    separatorBuilder: (_, __) => const SizedBox(width: 10),
                    itemBuilder: (_, __) => const ShimmerBox(width: 140, height: 100, borderRadius: 12),
                  ),
                ),
                const SizedBox(height: 24),
                ...List.generate(5, (_) => const Padding(
                  padding: EdgeInsets.only(bottom: 4),
                  child: ShimmerTrackRow(),
                )),
              ],
            ),
          ),
        ),
      ],
    );
  }

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------

  Widget _buildError(BuildContext context, WidgetRef ref, [Object? error]) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 64, color: RannaTheme.mutedForeground),
            const SizedBox(height: 16),
            Text('حدث خطأ', style: Theme.of(context).textTheme.titleMedium),
            if (error != null) ...[
              const SizedBox(height: 8),
              Text(
                error.toString(),
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: RannaTheme.mutedForeground,
                    ),
                textAlign: TextAlign.center,
                maxLines: 5,
                overflow: TextOverflow.ellipsis,
              ),
            ],
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => ref.invalidate(homeDataProvider),
              child: const Text('إعادة المحاولة'),
            ),
          ],
        ),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // App bar
  // ---------------------------------------------------------------------------

  SliverAppBar _buildAppBar(BuildContext? context) {
    return SliverAppBar(
      floating: true,
      backgroundColor: RannaTheme.card,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      title: Text(
        'رنّة',
        style: TextStyle(
          color: RannaTheme.primary,
          fontWeight: FontWeight.bold,
          fontSize: 26,
        ),
      ),
      actions: [
        if (context != null)
          IconButton(
            icon: const Icon(Icons.search, color: RannaTheme.foreground),
            onPressed: () => context.go('/search'),
          ),
      ],
    );
  }

  // ---------------------------------------------------------------------------
  // Main content
  // ---------------------------------------------------------------------------

  Widget _buildContent(BuildContext context, WidgetRef ref, HomeData data) {
    return CustomScrollView(
      slivers: [
        _buildAppBar(context),

        // Hero banner
        SliverToBoxAdapter(child: _buildHeroBanner(context, data)),

        // Continue Listening
        if (data.recentTracks.isNotEmpty) ...[
          SliverToBoxAdapter(
            child: SectionHeader(title: 'أكمل الاستماع', onSeeAll: null),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: _buildContinueListeningGrid(context, ref, data),
            ),
          ),
        ],

        // Most Listened
        if (data.popularTracks.isNotEmpty) ...[
          SliverToBoxAdapter(
            child: SectionHeader(title: 'الأكثر استماعاً', onSeeAll: null),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: _buildMostListenedCard(context, ref, data),
            ),
          ),
        ],

        // Featured Playlists
        if (data.collections.isNotEmpty) ...[
          SliverToBoxAdapter(
            child: SectionHeader(
              title: 'قوائم مميزة',
              onSeeAll: () => context.go('/browse'),
            ),
          ),
          SliverToBoxAdapter(
            child: SizedBox(
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
                    onTap: () => context.push('/playlist/${collection.id}'),
                  );
                },
              ),
            ),
          ),
        ],

        // Artists
        if (data.artists.isNotEmpty) ...[
          SliverToBoxAdapter(
            child: SectionHeader(
              title: 'المادحون',
              onSeeAll: () => context.push('/artists'),
            ),
          ),
          SliverToBoxAdapter(
            child: SizedBox(
              height: 110,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsetsDirectional.only(start: 16),
                itemCount: data.artists.length,
                separatorBuilder: (_, __) => const SizedBox(width: 12),
                itemBuilder: (context, index) {
                  final artist = data.artists[index];
                  return ArtistCard(
                    artist: artist,
                    onTap: () => context.push('/profile/artist/${artist.id}'),
                  );
                },
              ),
            ),
          ),
        ],

        // Narrators
        if (data.narrators.isNotEmpty) ...[
          SliverToBoxAdapter(
            child: SectionHeader(
              title: 'الراوون',
              onSeeAll: () => context.push('/narrators'),
            ),
          ),
          SliverToBoxAdapter(
            child: SizedBox(
              height: 110,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsetsDirectional.only(start: 16),
                itemCount: data.narrators.length,
                separatorBuilder: (_, __) => const SizedBox(width: 12),
                itemBuilder: (context, index) {
                  return _NarratorCard(
                    narrator: data.narrators[index],
                    onTap: () => context.push('/profile/narrator/${data.narrators[index].id}'),
                  );
                },
              ),
            ),
          ),
        ],

        // Recently Added
        if (data.recentTracks.isNotEmpty) ...[
          SliverToBoxAdapter(
            child: SectionHeader(title: 'أضيفت مؤخراً', onSeeAll: null),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Card(
                margin: EdgeInsets.zero,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
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
            ),
          ),
        ],

        // Bottom padding for mini player + nav bar
        const SliverToBoxAdapter(child: SizedBox(height: 120)),
      ],
    );
  }

  // ---------------------------------------------------------------------------
  // Hero banner
  // ---------------------------------------------------------------------------

  Widget _buildHeroBanner(BuildContext context, HomeData data) {
    final bgImageUrl = data.featuredTracks.isNotEmpty
        ? getImageUrl(data.featuredTracks.first.imageUrl)
        : '';

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      height: 240,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        color: RannaTheme.primary,
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        fit: StackFit.expand,
        children: [
          // Background image
          if (bgImageUrl.isNotEmpty)
            CachedNetworkImage(
              imageUrl: bgImageUrl,
              fit: BoxFit.cover,
              errorWidget: (_, __, ___) => Container(color: RannaTheme.primary),
            ),
          // Dark gradient overlay
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: AlignmentDirectional.topEnd,
                end: AlignmentDirectional.bottomStart,
                colors: [
                  Colors.black.withValues(alpha: 0.15),
                  RannaTheme.primary.withValues(alpha: 0.85),
                ],
              ),
            ),
          ),
          // Content
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Counter chip
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.3),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 6,
                        height: 6,
                        decoration: const BoxDecoration(
                          color: RannaTheme.secondary,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 6),
                      const Text(
                        'استمع لأكثر من ٤٩١ مديحة',
                        style: TextStyle(color: Colors.white70, fontSize: 11),
                      ),
                    ],
                  ),
                ),
                const Spacer(),
                // Main title
                const Text(
                  'المداح السودانية',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    height: 1.2,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'أحمل المداح السودانية والأذكار من أشهر المادحين السودانيين',
                  style: TextStyle(color: Colors.white70, fontSize: 12),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 14),
                // CTA button
                ElevatedButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.headphones, size: 15),
                  label: const Text('اختبرنا لك'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: RannaTheme.secondary,
                    foregroundColor: RannaTheme.secondaryForeground,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                    ),
                    textStyle: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Continue Listening — 2×2 dark card grid
  // ---------------------------------------------------------------------------

  Widget _buildContinueListeningGrid(
      BuildContext context, WidgetRef ref, HomeData data) {
    final tracks = data.recentTracks.take(4).toList();
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: tracks.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 10,
        crossAxisSpacing: 10,
        childAspectRatio: 2.6,
      ),
      itemBuilder: (context, index) =>
          _ContinueCard(track: tracks[index], queue: data.recentTracks),
    );
  }

  // ---------------------------------------------------------------------------
  // Most Listened — white card with numbered rows + heart icons
  // ---------------------------------------------------------------------------

  Widget _buildMostListenedCard(
      BuildContext context, WidgetRef ref, HomeData data) {
    final tracks = data.popularTracks.take(5).toList();
    return Card(
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Column(
        children: tracks
            .asMap()
            .entries
            .map((entry) => _PopularTrackRow(
                  track: entry.value,
                  index: entry.key,
                  queue: tracks,
                ))
            .toList(),
      ),
    );
  }
}

// =============================================================================
// Continue Listening Card
// =============================================================================

class _ContinueCard extends ConsumerWidget {
  final MadhaWithRelations track;
  final List<MadhaWithRelations> queue;

  const _ContinueCard({
    required this.track,
    required this.queue,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return GestureDetector(
      onTap: () {
        ref.read(trackCacheProvider.notifier).state = {
          ...ref.read(trackCacheProvider),
          for (final t in queue) t.id: t,
        };
        ref.read(audioPlayerProvider.notifier).playTrack(
              track.id,
              queue: queue.map((t) => t.id).toList(),
            );
      },
      child: Container(
        decoration: BoxDecoration(
          color: RannaTheme.primary,
          borderRadius: BorderRadius.circular(12),
        ),
        padding: const EdgeInsets.all(10),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: SizedBox(
                width: 40,
                height: 40,
                child: CachedNetworkImage(
                  imageUrl: getImageUrl(track.imageUrl),
                  fit: BoxFit.cover,
                  errorWidget: (_, __, ___) => Container(
                    color: RannaTheme.primaryGlow,
                    child: const Icon(Icons.music_note, color: Colors.white54, size: 16),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    track.title,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (track.madihDetails != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      track.madihDetails!.name,
                      style: const TextStyle(color: Colors.white54, fontSize: 10),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// =============================================================================
// Popular Track Row (with heart icon instead of duration)
// =============================================================================

class _PopularTrackRow extends ConsumerWidget {
  final MadhaWithRelations track;
  final int index;
  final List<MadhaWithRelations> queue;

  const _PopularTrackRow({
    required this.track,
    required this.index,
    required this.queue,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final playerState = ref.watch(audioPlayerProvider);
    final isCurrentTrack = playerState.currentTrackId == track.id;

    return Material(
      color: isCurrentTrack
          ? RannaTheme.accent.withValues(alpha: 0.08)
          : Colors.transparent,
      child: InkWell(
        onTap: () {
          ref.read(trackCacheProvider.notifier).state = {
            ...ref.read(trackCacheProvider),
            for (final t in queue) t.id: t,
          };
          ref.read(audioPlayerProvider.notifier).playTrack(
                track.id,
                queue: queue.map((t) => t.id).toList(),
              );
        },
        child: Padding(
          padding: const EdgeInsetsDirectional.fromSTEB(16, 10, 12, 10),
          child: Row(
            children: [
              // Track number
              SizedBox(
                width: 24,
                child: Text(
                  toArabicNum(index + 1),
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        color: RannaTheme.mutedForeground,
                        fontWeight: FontWeight.bold,
                      ),
                  textAlign: TextAlign.center,
                ),
              ),
              const SizedBox(width: 10),
              // Album art
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: SizedBox(
                  width: 44,
                  height: 44,
                  child: CachedNetworkImage(
                    imageUrl: getImageUrl(track.imageUrl),
                    fit: BoxFit.cover,
                    errorWidget: (_, __, ___) => Container(
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(
                          colors: [RannaTheme.primary, RannaTheme.primaryGlow],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                      ),
                      child: Center(
                        child: Text(
                          track.title.isNotEmpty ? track.title[0] : '',
                          style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 14),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              // Title + subtitle
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      track.title,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            fontWeight: isCurrentTrack
                                ? FontWeight.w600
                                : FontWeight.w500,
                            color: isCurrentTrack
                                ? RannaTheme.accent
                                : RannaTheme.foreground,
                          ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      '${track.madihDetails?.name ?? track.madih}'
                      '${track.rawi != null ? ' - ${track.rawi!.name}' : ''}',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: RannaTheme.mutedForeground,
                          ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              // Heart icon
              Icon(
                Icons.favorite_border,
                size: 18,
                color: RannaTheme.mutedForeground,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// =============================================================================
// Narrator Card (circular avatar + name)
// =============================================================================

class _NarratorCard extends StatelessWidget {
  final Rawi narrator;
  final VoidCallback? onTap;

  const _NarratorCard({required this.narrator, this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: SizedBox(
        width: 80,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircleAvatar(
              radius: 32,
              backgroundColor: RannaTheme.muted,
              child: ClipOval(
                child: CachedNetworkImage(
                  imageUrl: getImageUrl(narrator.imageUrl),
                  width: 64,
                  height: 64,
                  fit: BoxFit.cover,
                  errorWidget: (_, __, ___) => Container(
                    width: 64,
                    height: 64,
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        colors: [RannaTheme.primaryGlow, RannaTheme.primary],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: Text(
                        narrator.name.isNotEmpty ? narrator.name[0] : '',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 20,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 6),
            Text(
              narrator.name,
              style: Theme.of(context).textTheme.labelSmall,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
