import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:ranna/components/common/shimmer_loading.dart';
import 'package:ranna/providers/supabase_providers.dart';
import 'package:ranna/theme/app_theme.dart';
import 'package:ranna/utils/format.dart';

/// Grid listing of all narrators (Ruwat).
///
/// Displays a 3-column grid of circular narrator avatars with names.
/// Tapping a narrator navigates to their profile page.
class AllNarratorsScreen extends ConsumerWidget {
  const AllNarratorsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final narratorsAsync = ref.watch(allNarratorsProvider);

    return Scaffold(
      backgroundColor: RannaTheme.background,
      appBar: AppBar(
        title: const Text('الرواة'),
        backgroundColor: RannaTheme.primary,
      ),
      body: narratorsAsync.when(
        loading: () => _buildLoading(),
        error: (_, __) => Center(
          child: Text(
            'حدث خطأ',
            style: Theme.of(context).textTheme.titleMedium,
          ),
        ),
        data: (narrators) => CustomScrollView(
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
                    final narrator = narrators[index];
                    final imageUrl = getImageUrl(narrator.imageUrl);

                    return GestureDetector(
                      onTap: () =>
                          context.push('/profile/narrator/${narrator.id}'),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          CircleAvatar(
                            radius: 40,
                            backgroundColor: RannaTheme.muted,
                            child: ClipOval(
                              child: imageUrl.isNotEmpty
                                  ? CachedNetworkImage(
                                      imageUrl: imageUrl,
                                      width: 80,
                                      height: 80,
                                      fit: BoxFit.cover,
                                      errorWidget: (_, __, ___) =>
                                          _buildGradientFallback(
                                              narrator.name),
                                    )
                                  : _buildGradientFallback(narrator.name),
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            narrator.name,
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
                  childCount: narrators.length,
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
