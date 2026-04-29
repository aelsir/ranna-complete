import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:ranna/components/common/ranna_image.dart';
import 'package:ranna/components/common/shimmer_loading.dart';
import 'package:ranna/components/common/ranna_app_bar.dart';
import 'package:ranna/models/rawi.dart';
import 'package:ranna/providers/supabase_providers.dart';
import 'package:ranna/theme/app_theme.dart';

/// Grid listing of all narrators (Ruwat) with infinite scroll pagination.
class AllNarratorsScreen extends ConsumerStatefulWidget {
  const AllNarratorsScreen({super.key});

  @override
  ConsumerState<AllNarratorsScreen> createState() => _AllNarratorsScreenState();
}

class _AllNarratorsScreenState extends ConsumerState<AllNarratorsScreen> {
  final ScrollController _scrollController = ScrollController();
  final List<Rawi> _narrators = [];
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
    ref.invalidate(paginatedNarratorsProvider(_currentPage));
  }

  @override
  Widget build(BuildContext context) {
    // Watch all loaded pages
    for (int page = 0; page <= _currentPage; page++) {
      final pageAsync = ref.watch(paginatedNarratorsProvider(page));
      pageAsync.whenData((pageData) {
        final existingIds = _narrators.map((n) => n.id).toSet();
        for (final narrator in pageData) {
          if (!existingIds.contains(narrator.id)) {
            _narrators.add(narrator);
            existingIds.add(narrator.id);
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

    final firstPageAsync = ref.watch(paginatedNarratorsProvider(0));

    return Scaffold(
      backgroundColor: RannaTheme.background,
      appBar: const RannaAppBar(title: 'الرواة'),
      body: firstPageAsync.when(
        loading: () => _buildLoading(),
        error: (_, _) => Center(
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
                delegate: SliverChildBuilderDelegate((context, index) {
                  if (index >= _narrators.length) return null;
                  final narrator = _narrators[index];
                  return GestureDetector(
                    onTap: () =>
                        context.push('/profile/narrator/${narrator.id}'),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        ClipOval(
                          child: RannaImage(
                            url: narrator.imageUrl,
                            width: 80,
                            height: 80,
                            fallbackWidget: _buildGradientFallback(
                              narrator.name,
                            ),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          narrator.name,
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(fontWeight: FontWeight.w600),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  );
                }, childCount: _narrators.length),
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
            const SliverToBoxAdapter(child: SizedBox(height: 100)),
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
      itemBuilder: (_, _) => const ShimmerArtistCard(),
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
