import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:ranna/components/common/ranna_image.dart';
import 'package:ranna/components/common/shimmer_loading.dart';
import 'package:ranna/components/track/track_row.dart';
import 'package:ranna/models/madha.dart';
import 'package:ranna/providers/supabase_providers.dart';
import 'package:ranna/services/audio_player_service.dart';
import 'package:ranna/theme/app_theme.dart';
import 'package:ranna/utils/format.dart';

/// Artist or Narrator profile page.
///
/// Displays a hero cover image, play-all action row, and a scrollable
/// list of tracks belonging to the selected artist or narrator.
class ProfileScreen extends ConsumerWidget {
  final String type;
  final String id;

  const ProfileScreen({super.key, required this.type, required this.id});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isArtist = type == 'artist';

    // Separate watches to preserve concrete types
    final tracksAsync = isArtist
        ? ref.watch(artistTracksProvider(id))
        : ref.watch(narratorTracksProvider(id));

    // Extract name/imageUrl based on type
    String? name;
    String? imageUrl;
    bool isLoading = false;
    bool hasError = false;

    if (isArtist) {
      final artistAsync = ref.watch(artistDetailProvider(id));
      artistAsync.when(
        loading: () => isLoading = true,
        error: (_, _) => hasError = true,
        data: (artist) {
          if (artist != null) {
            name = artist.name;
            imageUrl = artist.imageUrl;
          } else {
            hasError = true;
          }
        },
      );
    } else {
      final narratorAsync = ref.watch(narratorDetailProvider(id));
      narratorAsync.when(
        loading: () => isLoading = true,
        error: (_, _) => hasError = true,
        data: (narrator) {
          if (narrator != null) {
            name = narrator.name;
            imageUrl = narrator.imageUrl;
          } else {
            hasError = true;
          }
        },
      );
    }

    if (isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (hasError || name == null) {
      return Scaffold(
        backgroundColor: RannaTheme.background,
        body: Center(
          child: Text(
            'حدث خطأ',
            style: Theme.of(context).textTheme.titleMedium,
          ),
        ),
      );
    }

    final resolvedName = name!;
    final resolvedImageUrl = getImageUrl(imageUrl);

    return Scaffold(
      backgroundColor: RannaTheme.background,
      body: tracksAsync.when(
        loading: () => CustomScrollView(
          slivers: [
            _buildAppBar(context, resolvedName, resolvedImageUrl),
            SliverList(
              delegate: SliverChildBuilderDelegate(
                (_, _) => const ShimmerTrackRow(),
                childCount: 8,
              ),
            ),
          ],
        ),
        error: (_, _) => Center(
          child: Text(
            'حدث خطأ',
            style: Theme.of(context).textTheme.titleMedium,
          ),
        ),
        data: (tracks) =>
            _buildBody(context, ref, resolvedName, resolvedImageUrl, tracks),
      ),
    );
  }

  SliverAppBar _buildAppBar(
    BuildContext context,
    String name,
    String imageUrl,
  ) {
    return SliverAppBar(
      expandedHeight: 264,
      pinned: true,
      backgroundColor: RannaTheme.primary,
      leading: Padding(
        padding: const EdgeInsets.all(8.0),
        child: GestureDetector(
          onTap: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/');
            }
          },
          child: Container(
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: RannaTheme.muted.withValues(alpha: 0.8),
            ),
            child: const Icon(
              Icons.keyboard_arrow_right_rounded,
              size: 24,
              color: RannaTheme.foreground,
            ),
          ),
        ),
      ),
      flexibleSpace: FlexibleSpaceBar(
        title: Text(
          name,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
          ),
        ),
        background: Stack(
          fit: StackFit.expand,
          children: [
            if (imageUrl.isNotEmpty)
              RannaImage(
                url: imageUrl,
                width: double.infinity,
                height: 264,
                fit: BoxFit.cover,
                fallbackWidget: Container(color: RannaTheme.primary),
              )
            else
              Container(color: RannaTheme.primary),
            Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.bottomCenter,
                  end: Alignment.topCenter,
                  colors: [
                    RannaTheme.primary.withValues(alpha: 0.7),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBody(
    BuildContext context,
    WidgetRef ref,
    String name,
    String imageUrl,
    List<MadhaWithRelations> tracks,
  ) {
    return CustomScrollView(
      slivers: [
        _buildAppBar(context, name, imageUrl),

        // Action row
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsetsDirectional.symmetric(
              horizontal: 16,
              vertical: 12,
            ),
            child: Row(
              children: [
                ElevatedButton.icon(
                  onPressed: tracks.isEmpty
                      ? null
                      : () => _playAll(ref, tracks),
                  icon: const Icon(Icons.play_arrow_rounded),
                  label: const Text('تشغيل الكل'),
                ),
                const SizedBox(width: 12),
                Text(
                  '${toArabicNum(tracks.length)} مدحة',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: RannaTheme.mutedForeground,
                  ),
                ),
              ],
            ),
          ),
        ),

        // Track list
        SliverList(
          delegate: SliverChildBuilderDelegate(
            (context, index) =>
                TrackRow(track: tracks[index], index: index, queue: tracks),
            childCount: tracks.length,
          ),
        ),

        // Bottom padding for mini player + nav bar
        const SliverToBoxAdapter(child: SizedBox(height: 120)),
      ],
    );
  }

  void _playAll(WidgetRef ref, List<MadhaWithRelations> tracks) {
    if (tracks.isEmpty) return;

    // Populate the track cache
    final cache = Map<String, MadhaWithRelations>.from(
      ref.read(trackCacheProvider),
    );
    for (final track in tracks) {
      cache[track.id] = track;
    }
    ref.read(trackCacheProvider.notifier).state = cache;

    // Play the first track with the full queue
    ref
        .read(audioPlayerProvider.notifier)
        .playTrack(tracks.first.id, queue: tracks.map((t) => t.id).toList());
  }
}
