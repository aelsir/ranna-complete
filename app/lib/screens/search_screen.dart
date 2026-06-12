import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:ranna/theme/app_theme.dart';
import 'package:ranna/onboarding/tour/spotlight_tour.dart';
import 'package:ranna/onboarding/tour/tour_controller.dart';
import 'package:ranna/providers/supabase_providers.dart';
import 'package:ranna/providers/recent_searches_provider.dart';
import 'package:ranna/components/track/track_row.dart';
import 'package:ranna/components/common/ranna_image.dart';
import 'package:ranna/components/common/shimmer_loading.dart';
import 'package:ranna/models/madha.dart';
import 'package:ranna/utils/haptics.dart';

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final TextEditingController _controller = TextEditingController();
  final FocusNode _focusNode = FocusNode();
  Timer? _debounceTimer;

  /// Spotlight target for the first-visit "search by lyrics" tour.
  final _kalimatChipKey = GlobalKey();

  @override
  void initState() {
    super.initState();
    // Shell branches build lazily, so initState == first time the user ever
    // opens the search tab.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Future.delayed(const Duration(milliseconds: 700), _maybeShowTour);
    });
  }

  void _maybeShowTour() {
    if (!mounted) return;
    maybeShowSpotlightTour(
      context,
      ref,
      tourName: TourNames.search,
      steps: [
        TourStep(
          id: TourStepIds.searchLyrics,
          targetKey: _kalimatChipKey,
          icon: Icons.manage_search_rounded,
          title: 'ابحث في الكلمات',
          body:
              'لا يقتصر البحث على العنوان أو المادح أو الراوي — اكتب أي مقطع من كلمات المديح وسنجده لك.',
          holeRadius: RannaTheme.radiusFull,
        ),
      ],
    );
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _onSearchChanged(String value) {
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 400), () {
      ref.read(searchQueryProvider.notifier).state = value;
    });
  }

  void _setFilter(SearchFilter filter) {
    // User found the lyrics filter on their own — retire the tour step.
    if (filter == SearchFilter.kalimat) {
      ref.read(tourControllerProvider).markSeen(TourStepIds.searchLyrics);
    }
    // Tap the same chip twice → no haptic (no state change to confirm).
    if (ref.read(searchFilterProvider) == filter) return;
    Haptics.selection();
    ref.read(searchFilterProvider.notifier).state = filter;
  }

  /// Run a search for [query] immediately (from a recent or trending tap).
  /// Pushes the text into the field and skips the debounce so results show
  /// without waiting.
  void _applyQuery(String query) {
    Haptics.selection();
    _debounceTimer?.cancel();
    _controller.text = query;
    _controller.selection = TextSelection.collapsed(offset: query.length);
    ref.read(searchQueryProvider.notifier).state = query;
    _focusNode.requestFocus();
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final query = ref.watch(searchQueryProvider);
    final activeFilter = ref.watch(searchFilterProvider);
    final searchResults = ref.watch(searchResultsProvider);

    // Record a query in recent searches once it actually returns results.
    // (Fires per debounced keystroke; the notifier collapses prefixes so
    // only the longest typed query survives.)
    ref.listen<AsyncValue<List<SearchResult>>>(searchResultsProvider,
        (prev, next) {
      next.whenData((results) {
        final q = ref.read(searchQueryProvider).trim();
        if (q.isNotEmpty && results.isNotEmpty) {
          ref.read(recentSearchesProvider.notifier).add(q);
        }
      });
    });

    // We no longer sync provider → controller here because the old
    // approach would push .trim()-ed text back into the TextField,
    // deleting trailing spaces the user just typed. The clear button
    // and any external callers reset both provider + controller directly.

    return Directionality(
      textDirection: TextDirection.rtl,
      child: GestureDetector(
        behavior: HitTestBehavior.translucent,
        onTap: () => FocusScope.of(context).unfocus(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Title
            Padding(
              padding: const EdgeInsetsDirectional.fromSTEB(20, 20, 20, 16),
              child: Text(
                'فتّش',
                style: TextStyle(
                  fontFamily: RannaTheme.fontFustat,
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: RannaTheme.foreground,
                ),
              ),
            ),

            // Search bar
            Padding(
              padding: const EdgeInsetsDirectional.fromSTEB(20, 0, 20, 12),
              child: TextField(
                controller: _controller,
                focusNode: _focusNode,
                onChanged: (val) {
                  _onSearchChanged(val);
                  setState(() {});
                },
                style: TextStyle(
                  fontFamily: RannaTheme.fontNotoNaskh,
                  fontSize: 16,
                  color: RannaTheme.foreground,
                ),
                decoration: InputDecoration(
                  filled: true,
                  fillColor: RannaTheme.muted,
                  hintText: 'ابحث عن مدحة، مادح، راوي أو كلمات...',
                  hintStyle: TextStyle(
                    fontFamily: RannaTheme.fontKufam,
                    fontSize: 14,
                    color: RannaTheme.mutedForeground,
                  ),
                  prefixIcon: const Padding(
                    padding: EdgeInsetsDirectional.only(start: 16, end: 8),
                    child: Icon(
                      Icons.search_rounded,
                      color: RannaTheme.mutedForeground,
                      size: 22,
                    ),
                  ),
                  prefixIconConstraints: const BoxConstraints(
                    minWidth: 42,
                    minHeight: 42,
                  ),
                  suffixIcon: _controller.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(
                            Icons.close_rounded,
                            size: 20,
                            color: RannaTheme.mutedForeground,
                          ),
                          onPressed: () {
                            _controller.clear();
                            ref.read(searchQueryProvider.notifier).state = '';
                            setState(() {});
                          },
                        )
                      : null,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(RannaTheme.radiusFull),
                    borderSide: BorderSide.none,
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(RannaTheme.radiusFull),
                    borderSide: BorderSide.none,
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(RannaTheme.radiusFull),
                    borderSide: const BorderSide(
                      color: RannaTheme.primary,
                      width: 1.5,
                    ),
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 14,
                  ),
                ),
              ),
            ),

            // Filter chips with counts
            SizedBox(
              height: 36,
              child: searchResults.when(
                loading: () => _buildFilterChips(activeFilter, query, []),
                error: (_, _) => _buildFilterChips(activeFilter, query, []),
                data: (results) =>
                    _buildFilterChips(activeFilter, query, results),
              ),
            ),

            const SizedBox(height: 12),

            // Results area
            Expanded(
              child: query.isEmpty
                  ? _buildEmptyState()
                  : searchResults.when(
                      loading: () => _buildLoadingState(),
                      error: (_, _) => _buildErrorState(),
                      data: (allResults) {
                        // Filter results based on active filter
                        final results = activeFilter == SearchFilter.all
                            ? allResults
                            : allResults.where((r) {
                                switch (activeFilter) {
                                  case SearchFilter.madha:
                                    return r.type == SearchResultType.madha;
                                  case SearchFilter.kalimat:
                                    return r.type == SearchResultType.kalimat;
                                  case SearchFilter.madih:
                                    return r.type == SearchResultType.madih;
                                  case SearchFilter.rawi:
                                    return r.type == SearchResultType.rawi;
                                  case SearchFilter.all:
                                    return true;
                                }
                              }).toList();
                        return results.isEmpty
                            ? _buildNoResultsState()
                            : _buildResultsList(results);
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChips(
    SearchFilter activeFilter,
    String query,
    List<SearchResult> results,
  ) {
    // Count per type from all results (ignoring current filter)
    final counts = <SearchResultType, int>{};
    for (final r in results) {
      counts[r.type] = (counts[r.type] ?? 0) + 1;
    }
    return ListView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsetsDirectional.fromSTEB(20, 0, 20, 0),
      children: [
        _buildFilterChip(
          'الكل',
          SearchFilter.all,
          activeFilter,
          query.isNotEmpty ? results.length : null,
          query,
        ),
        const SizedBox(width: 8),
        _buildFilterChip(
          'مدحة',
          SearchFilter.madha,
          activeFilter,
          query.isNotEmpty ? (counts[SearchResultType.madha] ?? 0) : null,
          query,
        ),
        const SizedBox(width: 8),
        KeyedSubtree(
          key: _kalimatChipKey,
          child: _buildFilterChip(
            'كلمات',
            SearchFilter.kalimat,
            activeFilter,
            query.isNotEmpty ? (counts[SearchResultType.kalimat] ?? 0) : null,
            query,
          ),
        ),
        const SizedBox(width: 8),
        _buildFilterChip(
          'مادح',
          SearchFilter.madih,
          activeFilter,
          query.isNotEmpty ? (counts[SearchResultType.madih] ?? 0) : null,
          query,
        ),
        const SizedBox(width: 8),
        _buildFilterChip(
          'راوي',
          SearchFilter.rawi,
          activeFilter,
          query.isNotEmpty ? (counts[SearchResultType.rawi] ?? 0) : null,
          query,
        ),
      ],
    );
  }

  Widget _buildFilterChip(
    String label,
    SearchFilter filter,
    SearchFilter active,
    int? count,
    String query,
  ) {
    // While the spotlight tour points at the كلمات chip, render it in its
    // selected (emerald) look — the highlight is the chip itself.
    final spotlighted =
        filter == SearchFilter.kalimat &&
        ref.watch(activeTourStepProvider) == TourStepIds.searchLyrics;
    final isActive = active == filter || spotlighted;
    final hasResults = count == null || count > 0;
    final isDim = query.isNotEmpty && !hasResults && !isActive;

    return GestureDetector(
      onTap: () => _setFilter(filter),
      child: AnimatedContainer(
        duration: 200.ms,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        decoration: BoxDecoration(
          color: isActive ? RannaTheme.primary : RannaTheme.muted,
          borderRadius: BorderRadius.circular(RannaTheme.radiusFull),
          border: isActive
              ? null
              : Border.all(color: RannaTheme.border.withValues(alpha: 0.5)),
        ),
        child: AnimatedOpacity(
          duration: 200.ms,
          opacity: isDim ? 0.4 : 1.0,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontFamily: RannaTheme.fontFustat,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: isActive
                      ? RannaTheme.background
                      : RannaTheme.foreground,
                ),
              ),
              if (count != null && count > 0) ...[
                const SizedBox(width: 4),
                Text(
                  '($count)',
                  style: TextStyle(
                    fontFamily: RannaTheme.fontFustat,
                    fontSize: 10,
                    fontWeight: FontWeight.w500,
                    color:
                        (isActive
                                ? RannaTheme.background
                                : RannaTheme.foreground)
                            .withValues(alpha: 0.6),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  /// Shown while the query is empty: recent searches + trending artists.
  /// Falls back to a plain prompt when there's nothing to suggest yet.
  Widget _buildEmptyState() {
    final recents = ref.watch(recentSearchesProvider);
    final trending = ref.watch(homeDataProvider).maybeWhen(
          data: (d) => d.artists.map((a) => a.name).take(8).toList(),
          orElse: () => const <String>[],
        );

    if (recents.isEmpty && trending.isEmpty) {
      return _buildInitialPrompt();
    }

    return ListView(
      padding: const EdgeInsetsDirectional.fromSTEB(20, 4, 20, 100),
      children: [
        if (recents.isNotEmpty) ...[
          _buildSectionHeader(
            'عمليات البحث الأخيرة',
            action: GestureDetector(
              onTap: () {
                Haptics.selection();
                ref.read(recentSearchesProvider.notifier).clear();
              },
              child: Text(
                'مسح الكل',
                style: TextStyle(
                  fontFamily: RannaTheme.fontFustat,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: RannaTheme.primary,
                ),
              ),
            ),
          ),
          const SizedBox(height: 4),
          ...recents.map(_buildRecentRow),
          const SizedBox(height: 24),
        ],
        if (trending.isNotEmpty) ...[
          _buildSectionHeader('الأكثر بحثاً'),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: trending.map(_buildTrendingChip).toList(),
          ),
        ],
      ],
    );
  }

  Widget _buildInitialPrompt() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.search_rounded,
            size: 64,
            color: RannaTheme.mutedForeground.withValues(alpha: 0.4),
          ),
          const SizedBox(height: 16),
          Text(
            'ابدأ بالكتابة للبحث...',
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

  Widget _buildSectionHeader(String title, {Widget? action}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          title,
          style: TextStyle(
            fontFamily: RannaTheme.fontFustat,
            fontSize: 15,
            fontWeight: FontWeight.bold,
            color: RannaTheme.foreground,
          ),
        ),
        ?action,
      ],
    );
  }

  Widget _buildRecentRow(String query) {
    return InkWell(
      onTap: () => _applyQuery(query),
      borderRadius: BorderRadius.circular(RannaTheme.radiusSm),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 10),
        child: Row(
          children: [
            Icon(
              Icons.history_rounded,
              size: 20,
              color: RannaTheme.mutedForeground.withValues(alpha: 0.7),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                query,
                style: TextStyle(
                  fontFamily: RannaTheme.fontNotoNaskh,
                  fontSize: 15,
                  fontWeight: FontWeight.w300,
                  color: RannaTheme.foreground,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: 8),
            GestureDetector(
              onTap: () {
                Haptics.selection();
                ref.read(recentSearchesProvider.notifier).remove(query);
              },
              behavior: HitTestBehavior.opaque,
              child: Padding(
                padding: const EdgeInsets.all(4),
                child: Icon(
                  Icons.close_rounded,
                  size: 18,
                  color: RannaTheme.mutedForeground.withValues(alpha: 0.5),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTrendingChip(String label) {
    return GestureDetector(
      onTap: () => _applyQuery(label),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: RannaTheme.muted,
          borderRadius: BorderRadius.circular(RannaTheme.radiusFull),
          border: Border.all(color: RannaTheme.border.withValues(alpha: 0.5)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.trending_up_rounded,
              size: 14,
              color: RannaTheme.primary,
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontFamily: RannaTheme.fontFustat,
                fontSize: 13,
                fontWeight: FontWeight.w300,
                color: RannaTheme.foreground,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLoadingState() {
    return ListView(
      padding: const EdgeInsetsDirectional.fromSTEB(4, 0, 4, 0),
      children: List.generate(8, (_) => const ShimmerTrackRow()),
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
            'حدث خطأ في البحث',
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

  Widget _buildNoResultsState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.search_off_rounded,
            size: 64,
            color: RannaTheme.mutedForeground.withValues(alpha: 0.4),
          ),
          const SizedBox(height: 16),
          Text(
            'لا توجد نتائج',
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

  Widget _buildResultsList(List<SearchResult> results) {
    // Collect all track results (including lyrics matches) for queue building
    final trackResults = results
        .where(
          (r) =>
              (r.type == SearchResultType.madha ||
                  r.type == SearchResultType.kalimat) &&
              r.track != null,
        )
        .map((r) => r.track!)
        .toList();

    return ListView.builder(
      padding: const EdgeInsetsDirectional.fromSTEB(20, 0, 20, 100),
      itemCount: results.length,
      itemBuilder: (context, index) {
        final result = results[index];
        final Widget row;

        switch (result.type) {
          case SearchResultType.madha:
            row = _TrackSearchRow(
              result: result,
              index: index,
              trackQueue: trackResults,
            );
          case SearchResultType.kalimat:
            row = _LyricsSearchRow(
              result: result,
              index: index,
              trackQueue: trackResults,
            );
          case SearchResultType.madih:
            row = _PersonSearchRow(
              result: result,
              onTap: () => context.push('/profile/artist/${result.id}'),
            );
          case SearchResultType.rawi:
            row = _PersonSearchRow(
              result: result,
              onTap: () => context.push('/profile/narrator/${result.id}'),
            );
        }

        return row
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
}

// =============================================================================
// Track search result row
// =============================================================================

class _TrackSearchRow extends ConsumerWidget {
  final SearchResult result;
  final int index;
  final List<MadhaWithRelations> trackQueue;

  const _TrackSearchRow({
    required this.result,
    required this.index,
    required this.trackQueue,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (result.track == null) return const SizedBox.shrink();
    return TrackRow(track: result.track!, index: index, queue: trackQueue);
  }
}

// =============================================================================
// Lyrics search result row (track matched by lyrics content)
// =============================================================================

class _LyricsSearchRow extends ConsumerWidget {
  final SearchResult result;
  final int index;
  final List<MadhaWithRelations> trackQueue;

  const _LyricsSearchRow({
    required this.result,
    required this.index,
    required this.trackQueue,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (result.track == null) return const SizedBox.shrink();
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        TrackRow(track: result.track!, index: index, queue: trackQueue),
        if (result.lyricsSnippet != null)
          Padding(
            padding: const EdgeInsetsDirectional.fromSTEB(42, 0, 12, 8),
            child: Row(
              children: [
                Icon(
                  Icons.menu_book_rounded,
                  size: 12,
                  color: RannaTheme.mutedForeground.withValues(alpha: 0.4),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    '«${result.lyricsSnippet}»',
                    style: TextStyle(
                      fontFamily: RannaTheme.fontNotoNaskh,
                      fontSize: 11,
                      color: RannaTheme.mutedForeground.withValues(alpha: 0.6),
                      height: 1.6,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

// =============================================================================
// Artist / Narrator search result row
// =============================================================================

class _PersonSearchRow extends StatelessWidget {
  final SearchResult result;
  final VoidCallback onTap;

  const _PersonSearchRow({required this.result, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final isArtist = result.type == SearchResultType.madih;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: SizedBox(
          height: 56,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Row(
              children: [
                // Avatar
                ClipRRect(
                  borderRadius: BorderRadius.circular(
                    isArtist ? 28 : RannaTheme.radiusSm,
                  ),
                  child: RannaImage(
                    url: result.imageUrl,
                    width: 40,
                    height: 40,
                    fallbackWidget: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: isArtist
                              ? [RannaTheme.primary, RannaTheme.primaryGlow]
                              : [
                                  RannaTheme.accent,
                                  RannaTheme.accent.withValues(alpha: 0.7),
                                ],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                      ),
                      child: Center(
                        child: Text(
                          result.name.isNotEmpty ? result.name[0] : '',
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),

                // Name and type badge
                Expanded(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        result.name,
                        style: const TextStyle(
                          fontFamily: RannaTheme.fontFustat,
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: RannaTheme.foreground,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 1,
                        ),
                        decoration: BoxDecoration(
                          color: isArtist
                              ? RannaTheme.primary.withValues(alpha: 0.1)
                              : RannaTheme.accent.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(
                            RannaTheme.radiusFull,
                          ),
                        ),
                        child: Text(
                          result.subtitle ?? '',
                          style: TextStyle(
                            fontFamily: RannaTheme.fontFustat,
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: isArtist
                                ? RannaTheme.primary
                                : RannaTheme.accent,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // Arrow
                Icon(
                  Icons.chevron_left_rounded,
                  size: 20,
                  color: RannaTheme.mutedForeground.withValues(alpha: 0.4),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
