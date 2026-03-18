import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:ranna/components/common/ranna_image.dart';
import 'package:ranna/components/common/shimmer_loading.dart';
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
      appBar: AppBar(
        title: const Text('المادحين'),
        backgroundColor: RannaTheme.primary,
      ),
      body: firstPageAsync.when(
        loading: () => _buildLoading(),
        error: (_, __) => Center(
          child: Text(
            'حدث خطأ',
            style: Theme.of(context).textTheme.titleMedium,
          ),
        ),
        data: (_) => CustomScrollView(
          controller: _scrollController,
          slivers: [
            SliverPadding(
              padding: const EdgeInsetsDirectional.all(16),
              sliver: SliverGrid(
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 3,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 16,
                  childAspectRatio: 0.75,
                ),
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    if (index >= _artists.length) return null;
                    final artist = _artists[index];
                    return GestureDetector(
                      onTap: () =>
                          context.push('/profile/artist/${artist.id}'),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          ClipOval(
                            child: RannaImage(
                              url: artist.imageUrl,
                              width: 80,
                              height: 80,
                              fallbackWidget:
                                  _buildGradientFallback(artist.name),
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            artist.name,
                            style: Theme.of(context)
                                .textTheme
                                .bodySmall
                                ?.copyWith(fontWeight: FontWeight.w600),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    );
                  },
                  childCount: _artists.length,
                ),
              ),
            ),
            // Loading indicator at bottom
            if (_hasMore)
              const SliverToBoxAdapter(
                child: Padding(
                  padding: EdgeInsets.all(24),
                  child: Center(
                    child: SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  ),
                ),
              ),
            const SliverToBoxAdapter(
              child: SizedBox(height: 100),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLoading() {
    return GridView.builder(
      padding: const EdgeInsetsDirectional.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        crossAxisSpacing: 12,
        mainAxisSpacing: 16,
        childAspectRatio: 0.75,
      ),
      itemCount: 9,
      itemBuilder: (_, __) => const ShimmerArtistCard(),
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
