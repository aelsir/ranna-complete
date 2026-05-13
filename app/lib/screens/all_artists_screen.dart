import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:ranna/components/common/ranna_image.dart';
import 'package:ranna/components/common/shimmer_loading.dart';
import 'package:ranna/components/common/ranna_app_bar.dart';
import 'package:ranna/models/madih.dart';
import 'package:ranna/providers/supabase_providers.dart';
import 'package:ranna/theme/app_theme.dart';

/// Grid listing of all artists (Madiheen) with infinite scroll pagination.
class AllArtistsScreen extends ConsumerStatefulWidget {
  const AllArtistsScreen({super.key});

  @override
  ConsumerState<AllArtistsScreen> createState() => _AllArtistsScreenState();
}

class _AllArtistsScreenState extends ConsumerState<AllArtistsScreen> {
  final ScrollController _scrollController = ScrollController();
  final List<Madih> _artists = [];
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
    // Triggering a watch on the next page will cause the build to re-run
    // and pick up the new data via the effect below.
    ref.invalidate(paginatedArtistsProvider(_currentPage));
  }

  @override
  Widget build(BuildContext context) {
    // Watch all loaded pages
    for (int page = 0; page <= _currentPage; page++) {
      final pageAsync = ref.watch(paginatedArtistsProvider(page));
      pageAsync.whenData((pageData) {
        // Collect all unique artists
        final existingIds = _artists.map((a) => a.id).toSet();
        for (final artist in pageData) {
          if (!existingIds.contains(artist.id)) {
            _artists.add(artist);
            existingIds.add(artist.id);
          }
        }
        if (pageData.length < 30) {
          _hasMore = false;
        }
        if (_isLoadingMore) {
          _isLoadingMore = false;
        }
      });
    }

    final firstPageAsync = ref.watch(paginatedArtistsProvider(0));

    return Scaffold(
      backgroundColor: RannaTheme.background,
      appBar: const RannaAppBar(title: 'المادحين'),
      body: firstPageAsync.when(
        loading: () => _buildLoading(),
        error: (_, _) => Center(
          child: Text(
            'حدث خطأ',
            style: Theme.of(context).textTheme.titleMedium,
          ),
        ),
        data: (_) => ListView.separated(
          controller: _scrollController,
          padding: const EdgeInsets.only(top: 8, bottom: 120),
          itemCount: _artists.length + (_hasMore ? 1 : 0),
          separatorBuilder: (_, _) =>
              const Divider(indent: 84, endIndent: 16),
          itemBuilder: (context, index) {
            // Loading indicator at the end
            if (index >= _artists.length) {
              return const Padding(
                padding: EdgeInsets.all(24),
                child: Center(
                  child: SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                ),
              );
            }
            final artist = _artists[index];
            return ListTile(
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 4,
              ),
              leading: Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: RannaTheme.primary.withValues(alpha: 0.1),
                ),
                clipBehavior: Clip.antiAlias,
                child: artist.imageUrl != null
                    ? RannaImage(
                        url: artist.imageUrl,
                        width: 56,
                        height: 56,
                        fallbackWidget: _buildGradientFallback(artist.name),
                      )
                    : _buildGradientFallback(artist.name),
              ),
              title: Text(
                artist.name,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                      fontFamily: RannaTheme.fontFustat,
                    ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              subtitle: artist.trackCount > 0
                  ? Text(
                      '${artist.trackCount} مدحة',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: RannaTheme.mutedForeground,
                          ),
                    )
                  : null,
              onTap: () => context.push('/profile/artist/${artist.id}'),
            );
          },
        ),
      ),
    );
  }

  Widget _buildLoading() {
    return ListView.separated(
      padding: const EdgeInsets.only(top: 8),
      itemCount: 8,
      separatorBuilder: (_, _) =>
          const Divider(indent: 84, endIndent: 16),
      itemBuilder: (_, _) => const ListTile(
        contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        leading: ShimmerBox(width: 56, height: 56, borderRadius: 28),
        title: ShimmerBox(width: 120, height: 14, borderRadius: 4),
        subtitle: ShimmerBox(width: 60, height: 12, borderRadius: 4),
      ),
    );
  }

  Widget _buildGradientFallback(String name) {
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
