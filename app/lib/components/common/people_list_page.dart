/// Generic "all of X" list screen — used for the All Artists (المادحين)
/// and All Narrators (الرواة) pages. Both render the same visual list
/// with infinite-scroll pagination, a circular avatar, a name, an
/// optional track-count subtitle, and a search button in the app-bar
/// that deep-links into the search tab with the matching filter chip
/// pre-selected.
///
/// Usage:
///
/// ```dart
/// PeopleListPage<Madih>(
///   title: 'المادحين',
///   searchFilter: SearchFilter.madih,
///   pageProvider: paginatedArtistsProvider,
///   getId: (m) => m.id,
///   getName: (m) => m.name,
///   getImageUrl: (m) => m.imageUrl,
///   getTrackCount: (m) => m.trackCount,
///   getRoute: (m) => '/profile/artist/${m.id}',
/// );
/// ```
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:ranna/components/common/ranna_app_bar.dart';
import 'package:ranna/components/common/ranna_image.dart';
import 'package:ranna/components/common/shimmer_loading.dart';
import 'package:ranna/providers/supabase_providers.dart'
    show SearchFilter, searchFilterProvider, searchQueryProvider;
import 'package:ranna/theme/app_theme.dart';

/// One server page worth of rows. Mirrors the page size on the existing
/// people providers — bump together if you ever change them.
const int _peoplePageSize = 30;

class PeopleListPage<T> extends ConsumerStatefulWidget {
  final String title;
  final SearchFilter searchFilter;
  final FutureProviderFamily<List<T>, int> pageProvider;

  /// Field accessors — kept as callbacks instead of a shared interface
  /// so existing `Madih` / `Rawi` models don't need a new mixin.
  final String Function(T) getId;
  final String Function(T) getName;
  final String? Function(T) getImageUrl;
  final int Function(T) getTrackCount;
  final String Function(T) getRoute;

  /// e.g. `'مدحة'` / `'مدائح'`. The full label becomes
  /// `'{count} {label}'`, with Arabic plural rules handled by the
  /// caller (we keep this simple — count 1 uses single, else plural).
  final String trackCountSingleLabel;
  final String trackCountPluralLabel;

  const PeopleListPage({
    super.key,
    required this.title,
    required this.searchFilter,
    required this.pageProvider,
    required this.getId,
    required this.getName,
    required this.getImageUrl,
    required this.getTrackCount,
    required this.getRoute,
    this.trackCountSingleLabel = 'مدحة',
    this.trackCountPluralLabel = 'مدحة',
  });

  @override
  ConsumerState<PeopleListPage<T>> createState() => _PeopleListPageState<T>();
}

class _PeopleListPageState<T> extends ConsumerState<PeopleListPage<T>> {
  final ScrollController _scrollController = ScrollController();
  final List<T> _items = [];
  int _currentPage = 0;
  bool _hasMore = true;
  bool _isLoadingMore = false;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_isLoadingMore || !_hasMore) return;
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      _loadNextPage();
    }
  }

  void _loadNextPage() {
    setState(() => _isLoadingMore = true);
    _currentPage++;
    ref.invalidate(widget.pageProvider(_currentPage));
  }

  void _onSearchTap() {
    // Reset the search text so the user lands on a clean field, but keep
    // the filter pre-selected. The `?filter=` query param is read by
    // SearchScreen's initState.
    ref.read(searchQueryProvider.notifier).state = '';
    ref.read(searchFilterProvider.notifier).state = widget.searchFilter;
    context.go('/search?filter=${widget.searchFilter.name}');
  }

  @override
  Widget build(BuildContext context) {
    // Watch every page we've loaded so far — same pattern the original
    // screens used. New pages append unique items to `_items`.
    for (int page = 0; page <= _currentPage; page++) {
      final pageAsync = ref.watch(widget.pageProvider(page));
      pageAsync.whenData((rows) {
        final existingIds = _items.map(widget.getId).toSet();
        for (final row in rows) {
          if (!existingIds.contains(widget.getId(row))) {
            _items.add(row);
            existingIds.add(widget.getId(row));
          }
        }
        if (rows.length < _peoplePageSize) _hasMore = false;
        if (_isLoadingMore) _isLoadingMore = false;
      });
    }

    final firstPageAsync = ref.watch(widget.pageProvider(0));

    return Scaffold(
      backgroundColor: RannaTheme.background,
      appBar: RannaAppBar(
        title: widget.title,
        actions: [
          IconButton(
            tooltip: 'البحث',
            icon: Icon(Icons.search_rounded, color: RannaTheme.foreground),
            onPressed: _onSearchTap,
          ),
        ],
      ),
      body: firstPageAsync.when(
        loading: _buildLoading,
        error: (_, _) => Center(
          child: Text(
            'حدث خطأ',
            style: Theme.of(context).textTheme.titleMedium,
          ),
        ),
        // Elevated rounded card wrapper — matches the "الأكثر استماعاً"
        // section on the landing page so the list visually belongs to
        // the same design language.
        data: (_) => SingleChildScrollView(
          controller: _scrollController,
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 120),
          child: Container(
            decoration: BoxDecoration(
              color: RannaTheme.card,
              borderRadius: BorderRadius.circular(RannaTheme.radius2xl),
              boxShadow: RannaTheme.shadowCard,
              border:
                  Border.all(color: RannaTheme.border.withValues(alpha: 0.3)),
            ),
            clipBehavior: Clip.antiAlias,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                for (int i = 0; i < _items.length; i++) ...[
                  _PersonRow(
                    name: widget.getName(_items[i]),
                    imageUrl: widget.getImageUrl(_items[i]),
                    trackCount: widget.getTrackCount(_items[i]),
                    trackCountSingleLabel: widget.trackCountSingleLabel,
                    trackCountPluralLabel: widget.trackCountPluralLabel,
                    onTap: () => context.push(widget.getRoute(_items[i])),
                  ),
                  if (i < _items.length - 1)
                    Divider(
                      height: 1,
                      indent: 76,
                      color: RannaTheme.border.withValues(alpha: 0.3),
                    ),
                ],
                if (_hasMore)
                  const Padding(
                    padding: EdgeInsets.all(24),
                    child: Center(
                      child: SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLoading() {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 120),
      child: Container(
        decoration: BoxDecoration(
          color: RannaTheme.card,
          borderRadius: BorderRadius.circular(RannaTheme.radius2xl),
          boxShadow: RannaTheme.shadowCard,
          border:
              Border.all(color: RannaTheme.border.withValues(alpha: 0.3)),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (int i = 0; i < 8; i++) ...[
              const ListTile(
                contentPadding:
                    EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                leading: ShimmerBox(width: 56, height: 56, borderRadius: 28),
                title: ShimmerBox(width: 120, height: 14, borderRadius: 4),
                subtitle: ShimmerBox(width: 60, height: 12, borderRadius: 4),
              ),
              if (i < 7)
                Divider(
                  height: 1,
                  indent: 76,
                  color: RannaTheme.border,
                ),
            ],
          ],
        ),
      ),
    );
  }
}

class _PersonRow extends StatelessWidget {
  final String name;
  final String? imageUrl;
  final int trackCount;
  final String trackCountSingleLabel;
  final String trackCountPluralLabel;
  final VoidCallback onTap;

  const _PersonRow({
    required this.name,
    required this.imageUrl,
    required this.trackCount,
    required this.trackCountSingleLabel,
    required this.trackCountPluralLabel,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding:
          const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      leading: Container(
        width: 56,
        height: 56,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: RannaTheme.primary.withValues(alpha: 0.1),
        ),
        clipBehavior: Clip.antiAlias,
        child: imageUrl != null
            ? RannaImage(
                url: imageUrl,
                width: 56,
                height: 56,
                fallbackWidget: _GradientFallback(name: name),
              )
            : _GradientFallback(name: name),
      ),
      title: Text(
        name,
        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w600,
              fontFamily: RannaTheme.fontFustat,
            ),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      subtitle: trackCount > 0
          ? Text(
              '$trackCount ${trackCount == 1 ? trackCountSingleLabel : trackCountPluralLabel}',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: RannaTheme.mutedForeground,
                  ),
            )
          : null,
      onTap: onTap,
    );
  }
}

class _GradientFallback extends StatelessWidget {
  final String name;
  const _GradientFallback({required this.name});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 80,
      height: 80,
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
          name.isNotEmpty ? name[0] : '',
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 24,
          ),
        ),
      ),
    );
  }
}
