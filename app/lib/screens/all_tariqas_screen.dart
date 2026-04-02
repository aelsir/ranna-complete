import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ranna/theme/app_theme.dart';
import 'package:ranna/providers/supabase_providers.dart';
import 'package:ranna/components/common/ranna_app_bar.dart';

/// Grid/list of all Sufi orders (الطرق الصوفية).
class AllTariqasScreen extends ConsumerWidget {
  const AllTariqasScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tariqasAsync = ref.watch(allTuruqProvider);

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: const RannaAppBar(title: 'الطرق الصوفية'),
      body: tariqasAsync.when(
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
                onPressed: () => ref.invalidate(allTuruqProvider),
                child: const Text('إعادة المحاولة'),
              ),
            ],
          ),
        ),
        data: (tariqas) {
          if (tariqas.isEmpty) {
            return Center(
              child: Text(
                'لا توجد طرق صوفية',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: RannaTheme.mutedForeground,
                ),
              ),
            );
          }

          return ListView.separated(
            padding: const EdgeInsets.only(top: 8, bottom: 120),
            itemCount: tariqas.length,
            separatorBuilder: (_, _) =>
                const Divider(indent: 72, endIndent: 16),
            itemBuilder: (context, index) {
              final tariqa = tariqas[index];
              return ListTile(
                leading: CircleAvatar(
                  backgroundColor: RannaTheme.primary.withValues(alpha: 0.1),
                  child: const Icon(
                    Icons.auto_awesome,
                    color: RannaTheme.primary,
                  ),
                ),
                title: Text(
                  tariqa.name,
                  style: Theme.of(
                    context,
                  ).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
                ),
                subtitle: tariqa.description != null
                    ? Text(
                        tariqa.description!,
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
                onTap: () {
                  ScaffoldMessenger.of(
                    context,
                  ).showSnackBar(const SnackBar(content: Text('قريباً')));
                },
              );
            },
          );
        },
      ),
    );
  }
}
