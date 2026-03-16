import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:ranna/components/common/ranna_image.dart';
import 'package:ranna/components/common/shimmer_loading.dart';
import 'package:ranna/providers/supabase_providers.dart';
import 'package:ranna/theme/app_theme.dart';

/// Grid listing of all artists (Madiheen).
///
/// Displays a 3-column grid of circular artist avatars with names.
/// Tapping an artist navigates to their profile page.
class AllArtistsScreen extends ConsumerWidget {
  const AllArtistsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final artistsAsync = ref.watch(allArtistsProvider);

    return Scaffold(
      backgroundColor: RannaTheme.background,
      appBar: AppBar(
        title: const Text('المادحين'),
        backgroundColor: RannaTheme.primary,
      ),
      body: artistsAsync.when(
        loading: () => _buildLoading(),
        error: (_, __) => Center(
          child: Text(
            'حدث خطأ',
            style: Theme.of(context).textTheme.titleMedium,
          ),
        ),
        data: (artists) => CustomScrollView(
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
                    final artist = artists[index];

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
                              fallbackWidget: _buildGradientFallback(artist.name),
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
                  childCount: artists.length,
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
