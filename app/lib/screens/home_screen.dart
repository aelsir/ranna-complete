import 'dart:math';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ranna/components/common/ranna_image.dart';
import 'package:ranna/components/common/shimmer_loading.dart';
import 'package:ranna/components/home/collection_card.dart';
import 'package:ranna/components/home/section_header.dart';
import 'package:ranna/components/track/track_row.dart';
import 'package:ranna/models/madha.dart';
import 'package:ranna/models/rawi.dart';
import 'package:ranna/providers/favorites_provider.dart';
import 'package:ranna/providers/supabase_providers.dart';
import 'package:ranna/services/audio_player_service.dart';
import 'package:ranna/theme/app_theme.dart';
import 'package:ranna/utils/format.dart';
import 'package:ranna/utils/haptics.dart';

/// Single source of truth for how long the hero "track count" badge takes
/// to tick from 0 to the platform total. Tune here, the badge updates.
/// Mirrored on the web side by `COUNT_UP_DURATION_MS` in `useCountUp.ts`.
const _kCountUpDuration = Duration(seconds: 4);

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  final ScrollController _scrollController = ScrollController();
  final ValueNotifier<bool> _isScrolled = ValueNotifier(false);

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  void _onScroll() {
    final scrolled = _scrollController.offset > 40;
    if (_isScrolled.value != scrolled) {
      _isScrolled.value = scrolled;
    }
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    _isScrolled.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final homeData = ref.watch(homeDataProvider);

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: homeData.when(
        loading: () => _buildLoading(),
        error: (error, stack) {
          debugPrint('━━━ HomeScreen ERROR ━━━');
          debugPrint('$error');
          debugPrint('$stack');
          return _buildError(context, error);
        },
        data: (data) => _buildContent(context, data),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  Widget _buildLoading() {
    return CustomScrollView(
      slivers: [
        _buildStickyAppBar(forceScrolled: true),
        SliverToBoxAdapter(
          child: ShimmerGroup(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const ShimmerBox(
                  width: double.infinity,
                  height: 360,
                  borderRadius: 0,
                ),
                const SizedBox(height: 24),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Column(
                    children: [
                      GridView.count(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        crossAxisCount: 2,
                        mainAxisSpacing: 12,
                        crossAxisSpacing: 12,
                        childAspectRatio: 2.2,
                        children: List.generate(
                          4,
                          (_) => const ShimmerBox(
                            width: double.infinity,
                            height: 80,
                            borderRadius: 12,
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),
                      ...List.generate(
                        5,
                        (_) => const Padding(
                          padding: EdgeInsets.only(bottom: 4),
                          child: ShimmerTrackRow(),
                        ),
                      ),
                    ],
                  ),
                ),
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

  Widget _buildError(BuildContext context, [Object? error]) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
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
              '\u062D\u062F\u062B \u062E\u0637\u0623',
              style: Theme.of(context).textTheme.titleMedium,
            ),
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
  // Sticky glass app bar
  // ---------------------------------------------------------------------------

  SliverAppBar _buildStickyAppBar({bool forceScrolled = false}) {
    return SliverAppBar(
      pinned: true,
      floating: false,
      backgroundColor: RannaTheme.background,
      surfaceTintColor: Colors.transparent,
      scrolledUnderElevation: 0,
      elevation: 0,
      centerTitle: false,
      toolbarHeight: 56,
      bottom: const PreferredSize(
        preferredSize: Size.fromHeight(0.5),
        child: Divider(height: 0.5, thickness: 0.5, color: RannaTheme.border),
      ),
      title: Image.asset('assets/images/logo-ranna.png', height: 32),
      actions: [
        IconButton(
          icon: Icon(Icons.search_rounded, color: RannaTheme.foreground),
          onPressed: () => context.go('/search'),
        ),
      ],
    );
  }

  // ---------------------------------------------------------------------------
  // Main content
  // ---------------------------------------------------------------------------

  /// Builds the "Continue Listening" section from the user's actual history.
  List<Widget> _buildContinueListening() {
    final historyAsync = ref.watch(listeningHistoryProvider);
    return historyAsync.when(
      data: (tracks) {
        if (tracks.isEmpty) return [];
        return [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.only(top: 8),
              child: SectionHeader(title: 'أكمل الاستماع', onSeeAll: null),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: _ContinueListeningGrid(
                tracks: tracks.take(4).toList(),
                queue: tracks,
              ),
            ),
          ),
        ];
      },
      loading: () => [], // Don't block the page while loading
      error: (_, _) => [], // Silently skip on error
    );
  }

  Widget _buildContent(BuildContext context, HomeData data) {
    // Reverse the lists to ensure the first items in the collection
    // appear at the rightmost position in RTL layout.
    final reversedCollections = data.collections.reversed.toList();
    final reversedArtists = data.artists.reversed.toList();
    final reversedNarrators = data.narrators.reversed.toList();

    return CustomScrollView(
      controller: _scrollController,
      physics: const BouncingScrollPhysics(
        parent: AlwaysScrollableScrollPhysics(),
      ),
      slivers: [
        _buildStickyAppBar(),

        CupertinoSliverRefreshControl(
          onRefresh: () async {
            ref.invalidate(homeDataProvider);
            ref.invalidate(listeningHistoryProvider);
            // Wait for the provider to finish refetching
            await ref.read(homeDataProvider.future);
          },
        ),

        // Hero banner (full-bleed, no margin)
        SliverToBoxAdapter(
          child: _HeroBanner(
            data: data,
            onShufflePlay: () {
              // Collect all available tracks
              final allTracks = <MadhaWithRelations>[
                ...data.popularTracks,
                ...data.recentTracks,
                ...data.featuredTracks,
              ];
              if (allTracks.isEmpty) return;
              // Pick a random track
              final random = allTracks[Random().nextInt(allTracks.length)];
              // Cache and play
              ref.read(trackCacheProvider.notifier).state = {
                ...ref.read(trackCacheProvider),
                for (final t in allTracks) t.id: t,
              };
              ref
                  .read(audioPlayerProvider.notifier)
                  .playTrack(
                    random.id,
                    queue: allTracks.map((t) => t.id).toList(),
                  );
            },
          ),
        ),

        // Continue Listening (from user's actual listening history)
        ..._buildContinueListening(),

        // Trending Tracks
        if (data.popularTracks.isNotEmpty) ...[
          SliverToBoxAdapter(
            child: SectionHeader(title: 'الأكثر استماعاً', onSeeAll: null),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: _TrendingTracksCard(
                tracks: data.popularTracks.take(5).toList(),
              ),
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
              height: 200,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsetsDirectional.only(start: 20, end: 20),
                itemCount: data.collections.length,
                separatorBuilder: (_, _) => const SizedBox(width: 12),
                itemBuilder: (context, index) {
                  final collection = reversedCollections[index];
                  return CollectionCard(
                    collection: collection,
                    onTap: () => context.push('/playlist/${collection.id}'),
                  );
                },
              ),
            ),
          ),
        ],

        // Popular Artists
        if (data.artists.isNotEmpty) ...[
          SliverToBoxAdapter(
            child: SectionHeader(
              title: 'المادحون',
              onSeeAll: () => context.push('/artists'),
            ),
          ),
          SliverToBoxAdapter(
            child: SizedBox(
              height: 120,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsetsDirectional.only(start: 20, end: 20),
                itemCount: data.artists.length,
                separatorBuilder: (_, _) => const SizedBox(width: 14),
                itemBuilder: (context, index) {
                  final artist = reversedArtists[index];
                  return _PopularArtistAvatar(
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
              height: 120,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsetsDirectional.only(start: 20, end: 20),
                itemCount: data.narrators.length,
                separatorBuilder: (_, _) => const SizedBox(width: 14),
                itemBuilder: (context, index) {
                  final narrator = reversedNarrators[index];
                  return _NarratorCard(
                    narrator: narrator,
                    onTap: () =>
                        context.push('/profile/narrator/${narrator.id}'),
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
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Container(
                decoration: BoxDecoration(
                  color: RannaTheme.card,
                  borderRadius: BorderRadius.circular(RannaTheme.radius2xl),
                  boxShadow: RannaTheme.shadowCard,
                  border: Border.all(
                    color: RannaTheme.border.withValues(alpha: 0.3),
                  ),
                ),
                clipBehavior: Clip.antiAlias,
                child: Column(
                  children: data.recentTracks
                      .asMap()
                      .entries
                      .map(
                        (entry) => Column(
                          children: [
                            TrackRow(
                              track: entry.value,
                              index: entry.key,
                              queue: data.recentTracks,
                            ),
                            if (entry.key < data.recentTracks.length - 1)
                              Divider(
                                height: 1,
                                indent: 76,
                                color: RannaTheme.border.withValues(alpha: 0.3),
                              ),
                          ],
                        ),
                      )
                      .toList(),
                ),
              ),
            ),
          ),
        ],

        // Bottom padding for mini player + nav bar
        const SliverToBoxAdapter(child: SizedBox(height: 140)),
      ],
    );
  }
}

// =============================================================================
// Hero Banner — full-bleed with gradient overlays
// =============================================================================

class _HeroBanner extends StatelessWidget {
  final HomeData data;
  final VoidCallback? onShufflePlay;

  const _HeroBanner({required this.data, this.onShufflePlay});

  @override
  Widget build(BuildContext context) {
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: const BoxDecoration(color: RannaTheme.background),
      child: Stack(
        children: [
          // Non-positioned child to give Stack its intrinsic size
          const SizedBox(height: 480, width: double.infinity),

          // Background image — local asset
          Positioned.fill(
            child: Image.asset('assets/images/hero-bg.webp', fit: BoxFit.cover),
          ),

          // Gradient overlay: bottom fade to background (black)
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.bottomCenter,
                  end: Alignment.topCenter,
                  colors: [
                    RannaTheme.background,
                    RannaTheme.background.withValues(alpha: 0.2),
                    Colors.transparent,
                  ],
                  stops: const [0.0, 0.5, 1.0],
                ),
              ),
            ),
          ),

          // Content — bottom-right in RTL (which is bottom-start)
          Positioned(
            bottom: 40,
            right: 24,
            left: 24,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                // Live badge pill
                _LiveBadge(totalTracks: data.totalTracks)
                    .animate()
                    .fadeIn(duration: 600.ms)
                    .slideY(
                      begin: 0.3,
                      duration: 600.ms,
                      curve: Curves.easeOut,
                    ),

                const SizedBox(height: 16),

                // Title
                const Text(
                      'المدائح النبوية',
                      style: TextStyle(
                        fontFamily: RannaTheme.fontFustat,
                        color: Colors.white,
                        fontSize: 36,
                        fontWeight: FontWeight.w800,
                        height: 1.15,
                      ),
                    )
                    .animate()
                    .fadeIn(delay: 200.ms, duration: 600.ms)
                    .slideY(
                      begin: 0.2,
                      delay: 200.ms,
                      duration: 600.ms,
                      curve: Curves.easeOut,
                    ),

                const SizedBox(height: 8),

                // Subtitle
                Text(
                  'أجمل المدائح والأذكار من أشهر المادحين السودانيين',
                  style: TextStyle(
                    fontFamily: RannaTheme.fontNotoNaskh,
                    color: Colors.white.withValues(alpha: 0.65),
                    fontSize: 14,
                    height: 1.5,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ).animate().fadeIn(delay: 350.ms, duration: 500.ms),

                const SizedBox(height: 20),

                // CTA button
                Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(
                          RannaTheme.radiusFull,
                        ),
                        boxShadow: RannaTheme.shadowGlowAccent,
                      ),
                      child: ElevatedButton.icon(
                        onPressed: onShufflePlay,
                        icon: Transform.rotate(
                          angle: pi,
                          child: const Icon(Icons.shuffle_rounded, size: 18),
                        ),
                        label: const Text('إخترنا لك'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: RannaTheme.accent,
                          foregroundColor: RannaTheme.accentForeground,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 24,
                            vertical: 12,
                          ),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(
                              RannaTheme.radiusFull,
                            ),
                          ),
                          textStyle: const TextStyle(
                            fontFamily: RannaTheme.fontFustat,
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    )
                    .animate()
                    .fadeIn(delay: 500.ms, duration: 500.ms)
                    .slideY(
                      begin: 0.3,
                      delay: 500.ms,
                      duration: 500.ms,
                      curve: Curves.easeOut,
                    ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// =============================================================================
// Live badge pill with pulsing green dot
// =============================================================================

class _LiveBadge extends StatelessWidget {
  final int totalTracks;
  const _LiveBadge({this.totalTracks = 0});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: RannaTheme.primary.withValues(alpha: 0.4),
        borderRadius: BorderRadius.circular(RannaTheme.radiusFull),
        border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Pulsing green dot with glow
          SizedBox(
            width: 14,
            height: 14,
            child: Stack(
              alignment: Alignment.center,
              children: [
                // Outer glow ring
                Container(
                      width: 14,
                      height: 14,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: RannaTheme.secondary.withValues(alpha: 0.3),
                      ),
                    )
                    .animate(onPlay: (c) => c.repeat(reverse: true))
                    .scaleXY(
                      begin: 0.6,
                      end: 1.0,
                      duration: 1200.ms,
                      curve: Curves.easeInOut,
                    )
                    .fadeIn(begin: 0.3, duration: 1200.ms),
                // Inner dot
                Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: RannaTheme.secondary,
                    shape: BoxShape.circle,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          // Until we have a real track count, show the bare "listen now"
          // label — counting up from zero before the number is known
          // would just be a zero on screen, which is uglier than a clean
          // single-line label.
          if (totalTracks <= 0)
            const Text(
              'استمع الآن',
              style: TextStyle(
                fontFamily: RannaTheme.fontFustat,
                color: Colors.white70,
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            )
          else
            Text.rich(
              TextSpan(
                style: const TextStyle(
                  fontFamily: RannaTheme.fontFustat,
                  color: Colors.white70,
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
                children: [
                  const TextSpan(text: 'استمع الآن لأكثر من '),
                  // Inline ticking number. `WidgetSpan` keeps it baseline-
                  // aligned with the surrounding Arabic, and a `ValueKey`
                  // on the target makes the tween restart from 0 if the
                  // number changes (e.g. after a pull-to-refresh fetches
                  // a new total). Without the key, a target change would
                  // animate from the previous value, not from 0.
                  WidgetSpan(
                    alignment: PlaceholderAlignment.baseline,
                    baseline: TextBaseline.alphabetic,
                    child: TweenAnimationBuilder<int>(
                      key: ValueKey(totalTracks),
                      tween: IntTween(begin: 0, end: totalTracks),
                      duration: _kCountUpDuration,
                      curve: Curves.easeOut,
                      builder: (_, value, _) => Text(
                        '$value',
                        style: const TextStyle(
                          fontFamily: RannaTheme.fontFustat,
                          color: Colors.white70,
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          // Tabular figures so the badge width doesn't
                          // jitter as the digit count grows mid-tween.
                          fontFeatures: [FontFeature.tabularFigures()],
                        ),
                      ),
                    ),
                  ),
                  const TextSpan(text: ' مدحة'),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

// =============================================================================
// Continue Listening Grid — 2-column, dark cards
// =============================================================================

class _ContinueListeningGrid extends StatelessWidget {
  final List<MadhaWithRelations> tracks;
  final List<MadhaWithRelations> queue;

  const _ContinueListeningGrid({required this.tracks, required this.queue});

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: tracks.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 2.0,
      ),
      itemBuilder: (context, index) =>
          _ContinueCard(track: tracks[index], queue: queue),
    );
  }
}

// =============================================================================
// Continue Listening Card
// =============================================================================

class _ContinueCard extends ConsumerWidget {
  final MadhaWithRelations track;
  final List<MadhaWithRelations> queue;

  const _ContinueCard({required this.track, required this.queue});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return GestureDetector(
      onTap: () {
        ref.read(trackCacheProvider.notifier).state = {
          ...ref.read(trackCacheProvider),
          for (final t in queue) t.id: t,
        };
        ref
            .read(audioPlayerProvider.notifier)
            .playTrack(track.id, queue: queue.map((t) => t.id).toList());
      },
      child: Container(
        height: 80,
        decoration: BoxDecoration(
          color: const Color(0xFF0F1F28),
          borderRadius: BorderRadius.circular(RannaTheme.radiusLg),
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          fit: StackFit.expand,
          children: [
            // Background image at 60% opacity
            if (track.resolvedImageUrl != null)
              Opacity(
                opacity: 0.6,
                child: RannaImage(
                  url: track.resolvedImageUrl,
                  width: double.infinity,
                  height: 80,
                  fit: BoxFit.cover,
                  fallbackWidget: Container(color: RannaTheme.primary),
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

            // Content
            Positioned(
              bottom: 14,
              right: 12,
              left: 12,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    track.title,
                    style: const TextStyle(
                      fontFamily: RannaTheme.fontFustat,
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (track.madihDetails != null || track.madih.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(
                      track.madihDetails?.name ?? track.madih,
                      style: TextStyle(
                        fontFamily: RannaTheme.fontNotoNaskh,
                        color: Colors.white.withValues(alpha: 0.6),
                        fontSize: 11,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ],
              ),
            ),

            // Progress bar at bottom
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: Container(
                height: 3,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.15),
                ),
                child: FractionallySizedBox(
                  alignment: AlignmentDirectional.centerStart,
                  widthFactor: 0.35, // Placeholder progress
                  child: Container(
                    decoration: BoxDecoration(
                      color: RannaTheme.accent,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// =============================================================================
// Trending Tracks Card — numbered rows with heart icons and dividers
// =============================================================================

class _TrendingTracksCard extends StatelessWidget {
  final List<MadhaWithRelations> tracks;

  const _TrendingTracksCard({required this.tracks});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: RannaTheme.card,
        borderRadius: BorderRadius.circular(RannaTheme.radius2xl),
        boxShadow: RannaTheme.shadowCard,
        border: Border.all(color: RannaTheme.border.withValues(alpha: 0.3)),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: tracks
            .asMap()
            .entries
            .map(
              (entry) => Column(
                children: [
                  _TrendingTrackRow(
                    track: entry.value,
                    index: entry.key,
                    queue: tracks,
                  ),
                  if (entry.key < tracks.length - 1)
                    Divider(
                      height: 1,
                      indent: 76,
                      color: RannaTheme.border.withValues(alpha: 0.3),
                    ),
                ],
              ),
            )
            .toList(),
      ),
    );
  }
}

// =============================================================================
// Trending Track Row (with heart icon)
// =============================================================================

class _TrendingTrackRow extends ConsumerWidget {
  final MadhaWithRelations track;
  final int index;
  final List<MadhaWithRelations> queue;

  const _TrendingTrackRow({
    required this.track,
    required this.index,
    required this.queue,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isCurrentTrack =
        ref.watch(audioPlayerProvider.select((s) => s.currentTrackId)) ==
        track.id;

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
          ref
              .read(audioPlayerProvider.notifier)
              .playTrack(track.id, queue: queue.map((t) => t.id).toList());
        },
        child: Padding(
          padding: const EdgeInsetsDirectional.fromSTEB(16, 12, 14, 12),
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
              const SizedBox(width: 12),

              // Thumbnail 40x40 rounded-lg
              ClipRRect(
                borderRadius: BorderRadius.circular(RannaTheme.radiusLg),
                child: RannaImage(
                  url: track.resolvedImageUrl,
                  width: 40,
                  height: 40,
                ),
              ),
              const SizedBox(width: 12),

              // Title + subtitle
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      track.title,
                      style: TextStyle(
                        fontFamily: RannaTheme.fontFustat,
                        fontSize: 14,
                        fontWeight: isCurrentTrack
                            ? FontWeight.bold
                            : FontWeight.w600,
                        color: isCurrentTrack
                            ? RannaTheme.accent
                            : RannaTheme.foreground,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${track.madihDetails?.name ?? track.madih}'
                      '${track.rawi != null ? ' - ${track.rawi!.name}' : ''}',
                      style: const TextStyle(
                        fontFamily: RannaTheme.fontFustat,
                        fontSize: 11,
                        color: RannaTheme.mutedForeground,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),

              // Duration
              Padding(
                padding: const EdgeInsetsDirectional.only(end: 8),
                child: Text(
                  formatDuration(track.durationSeconds),
                  style: const TextStyle(
                    fontFamily: RannaTheme.fontFustat,
                    fontSize: 11,
                    color: RannaTheme.mutedForeground,
                  ),
                ),
              ),

              // Heart icon
              Builder(
                builder: (context) {
                  final isFav = ref.watch(
                    favoritesProvider.select((s) => s.contains(track.id)),
                  );
                  return GestureDetector(
                    onTap: () {
                      isFav ? Haptics.selection() : Haptics.light();
                      ref.read(favoritesProvider.notifier).toggle(track.id);
                    },
                    child: Icon(
                      isFav
                          ? Icons.favorite_rounded
                          : Icons.favorite_border_rounded,
                      size: 18,
                      color: isFav
                          ? RannaTheme.favoriteHeart
                          : RannaTheme.mutedForeground,
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// =============================================================================
// Popular Artist Avatar — circular 76dp
// =============================================================================

class _PopularArtistAvatar extends StatelessWidget {
  final dynamic artist;
  final VoidCallback? onTap;

  const _PopularArtistAvatar({required this.artist, this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: SizedBox(
        width: 84,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 76,
              height: 76,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: RannaTheme.border.withValues(alpha: 0.4),
                  width: 2,
                ),
                boxShadow: RannaTheme.shadowSm,
              ),
              child: ClipOval(
                child: RannaImage(
                  url: artist.imageUrl,
                  width: 76,
                  height: 76,
                  fallbackWidget: Container(
                    width: 76,
                    height: 76,
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        colors: [RannaTheme.primary, RannaTheme.primaryGlow],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: Text(
                        artist.name.isNotEmpty ? artist.name[0] : '',
                        style: const TextStyle(
                          fontFamily: RannaTheme.fontFustat,
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 24,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              artist.name,
              style: const TextStyle(
                fontFamily: RannaTheme.fontFustat,
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: RannaTheme.foreground,
              ),
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

// =============================================================================
// Narrator Card — rounded-xl squares
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
        width: 84,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 76,
              height: 76,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(RannaTheme.radiusXl),
                border: Border.all(
                  color: RannaTheme.border.withValues(alpha: 0.4),
                  width: 2,
                ),
                boxShadow: RannaTheme.shadowSm,
              ),
              clipBehavior: Clip.antiAlias,
              child: RannaImage(
                url: narrator.imageUrl,
                width: 76,
                height: 76,
                borderRadius: BorderRadius.circular(RannaTheme.radiusXl - 2),
                fallbackWidget: Container(
                  width: 76,
                  height: 76,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [RannaTheme.primaryGlow, RannaTheme.primary],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(
                      RannaTheme.radiusXl - 2,
                    ),
                  ),
                  child: Center(
                    child: Text(
                      narrator.name.isNotEmpty ? narrator.name[0] : '',
                      style: const TextStyle(
                        fontFamily: RannaTheme.fontFustat,
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 24,
                      ),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              narrator.name,
              style: const TextStyle(
                fontFamily: RannaTheme.fontFustat,
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: RannaTheme.foreground,
              ),
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
