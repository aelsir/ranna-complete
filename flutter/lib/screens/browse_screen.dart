import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ranna/theme/app_theme.dart';
import 'package:ranna/providers/supabase_providers.dart';
import 'package:ranna/components/home/section_header.dart';
import 'package:ranna/components/home/collection_card.dart';
import 'package:ranna/components/common/shimmer_loading.dart';

class BrowseScreen extends ConsumerWidget {
  const BrowseScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final collectionsAsync = ref.watch(allCollectionsProvider);

    return Scaffold(
      backgroundColor: RannaTheme.background,
      appBar: AppBar(
        title: const Text('تصفح'),
        backgroundColor: RannaTheme.primary,
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Category grid
            Padding(
              padding: const EdgeInsetsDirectional.all(16),
              child: GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                children: [
                  _buildCategoryCard(
                    context,
                    icon: Icons.person,
                    label: 'المادحين',
                    onTap: () => context.push('/artists'),
                  ),
                  _buildCategoryCard(
                    context,
                    icon: Icons.record_voice_over,
                    label: 'الرواة',
                    onTap: () => context.push('/narrators'),
                  ),
                  _buildCategoryCard(
                    context,
                    icon: Icons.auto_awesome,
                    label: 'الطرق الصوفية',
                    onTap: () => context.push('/tariqas'),
                  ),
                  _buildCategoryCard(
                    context,
                    icon: Icons.music_note,
                    label: 'الفنون',
                    onTap: () => context.push('/funoon'),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Collections section
            SectionHeader(title: 'قوائم التشغيل', onSeeAll: null),

            collectionsAsync.when(
              loading: () => SizedBox(
                height: 180,
                child: Row(
                  children: List.generate(
                    3,
                    (_) => const Padding(
                      padding: EdgeInsetsDirectional.only(start: 16),
                      child: ShimmerCollectionCard(),
                    ),
                  ),
                ),
              ),
              error: (_, __) => Padding(
                padding: const EdgeInsetsDirectional.only(start: 16),
                child: Text(
                  'حدث خطأ',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: RannaTheme.mutedForeground,
                      ),
                ),
              ),
              data: (collections) => SizedBox(
                height: 180,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsetsDirectional.only(start: 16),
                  itemCount: collections.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 12),
                  itemBuilder: (context, index) {
                    final collection = collections[index];
                    return CollectionCard(
                      collection: collection,
                      onTap: () =>
                          context.push('/playlist/${collection.id}'),
                    );
                  },
                ),
              ),
            ),

            // Bottom padding for mini player + nav bar
            const SizedBox(height: 120),
          ],
        ),
      ),
    );
  }

  Widget _buildCategoryCard(
    BuildContext context, {
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: RannaTheme.card,
          borderRadius: BorderRadius.circular(16),
          boxShadow: RannaTheme.shadowSm,
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 48,
              color: RannaTheme.primary,
            ),
            const SizedBox(height: 8),
            Text(
              label,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}
