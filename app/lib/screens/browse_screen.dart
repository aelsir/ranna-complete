import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ranna/theme/app_theme.dart';
import 'package:ranna/providers/supabase_providers.dart';
import 'package:ranna/components/common/ranna_app_bar.dart';
import 'package:ranna/components/common/ranna_image.dart';

class BrowseScreen extends ConsumerWidget {
  const BrowseScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final collectionsAsync = ref.watch(allCollectionsProvider);

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: const RannaAppBar(title: 'القوائم المميزة'),
      body: collectionsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.error_outline,
                size: 48,
                color: RannaTheme.mutedForeground,
              ),
              const SizedBox(height: 12),
              Text('حدث خطأ', style: Theme.of(context).textTheme.bodyLarge),
              const SizedBox(height: 8),
              ElevatedButton(
                onPressed: () => ref.invalidate(allCollectionsProvider),
                child: const Text('إعادة المحاولة'),
              ),
            ],
          ),
        ),
        data: (collections) {
          if (collections.isEmpty) {
            return Center(
              child: Text(
                'لا توجد قوائم مميزة',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: RannaTheme.mutedForeground,
                ),
              ),
            );
          }

          return ListView.separated(
            padding: const EdgeInsets.only(top: 8, bottom: 120),
            itemCount: collections.length,
            separatorBuilder: (_, _) => const Divider(indent: 84, endIndent: 16),
            itemBuilder: (context, index) {
              final collection = collections[index];
              return ListTile(
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                leading: Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    color: RannaTheme.primary.withValues(alpha: 0.1),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: collection.imageUrl != null
                      ? RannaImage(
                          url: collection.imageUrl,
                          width: 56,
                          height: 56,
                          fallbackWidget: const Icon(Icons.queue_music, color: RannaTheme.primary),
                        )
                      : const Icon(Icons.queue_music, color: RannaTheme.primary),
                ),
                title: Text(
                  collection.name,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                        fontFamily: RannaTheme.fontFustat,
                      ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                subtitle: collection.description != null && collection.description!.isNotEmpty
                    ? Text(
                        collection.description!,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: RannaTheme.mutedForeground,
                            ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      )
                    : null,
                trailing: const Icon(
                  Icons.chevron_left,
                  color: RannaTheme.mutedForeground,
                ),
                onTap: () => context.push('/playlist/${collection.id}'),
              );
            },
          );
        },
      ),
    );
  }
}
