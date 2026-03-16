import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ranna/theme/app_theme.dart';
import 'package:ranna/providers/supabase_providers.dart';
import 'package:ranna/components/track/track_row.dart';
import 'package:ranna/components/common/shimmer_loading.dart';
import 'package:ranna/models/madha.dart';

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final TextEditingController _controller = TextEditingController();
  Timer? _debounceTimer;

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _onSearchChanged(String value) {
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 400), () {
      ref.read(searchQueryProvider.notifier).state = value.trim();
    });
  }

  @override
  Widget build(BuildContext context) {
    final query = ref.watch(searchQueryProvider);
    final searchResults = ref.watch(searchResultsProvider);

    return Scaffold(
      backgroundColor: RannaTheme.background,
      appBar: AppBar(
        title: const Text('البحث'),
        backgroundColor: RannaTheme.primary,
      ),
      body: Column(
        children: [
          // Search input
          Padding(
            padding: const EdgeInsetsDirectional.all(16),
            child: TextField(
              controller: _controller,
              onChanged: _onSearchChanged,
              decoration: InputDecoration(
                hintText: 'ابحث عن مدحة أو مادح...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _controller.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _controller.clear();
                          ref.read(searchQueryProvider.notifier).state = '';
                          setState(() {});
                        },
                      )
                    : null,
              ),
            ),
          ),

          // Results area
          Expanded(
            child: query.isEmpty
                ? _buildEmptyState(context)
                : searchResults.when(
                    loading: () => _buildLoadingState(),
                    error: (_, __) => _buildErrorState(context),
                    data: (results) => results.isEmpty
                        ? _buildNoResultsState(context)
                        : _buildResultsList(results),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(
            Icons.search,
            size: 64,
            color: RannaTheme.mutedForeground,
          ),
          const SizedBox(height: 16),
          Text(
            'ابدأ بالكتابة للبحث...',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: RannaTheme.mutedForeground,
                ),
          ),
        ],
      ),
    );
  }

  Widget _buildLoadingState() {
    return ListView(
      padding: const EdgeInsetsDirectional.only(start: 16, end: 16),
      children: List.generate(
        8,
        (_) => const ShimmerTrackRow(),
      ),
    );
  }

  Widget _buildErrorState(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(
            Icons.error_outline,
            size: 64,
            color: RannaTheme.mutedForeground,
          ),
          const SizedBox(height: 16),
          Text(
            'حدث خطأ في البحث',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: RannaTheme.mutedForeground,
                ),
          ),
        ],
      ),
    );
  }

  Widget _buildNoResultsState(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(
            Icons.search_off,
            size: 64,
            color: RannaTheme.mutedForeground,
          ),
          const SizedBox(height: 16),
          Text(
            'لا توجد نتائج',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: RannaTheme.mutedForeground,
                ),
          ),
        ],
      ),
    );
  }

  Widget _buildResultsList(List<MadhaWithRelations> results) {
    return ListView.builder(
      padding: const EdgeInsetsDirectional.only(start: 16, end: 16),
      itemCount: results.length + 1, // +1 for bottom padding
      itemBuilder: (context, index) {
        if (index == results.length) {
          return const SizedBox(height: 100);
        }
        return TrackRow(
          track: results[index],
          index: index,
          queue: results,
        );
      },
    );
  }
}
