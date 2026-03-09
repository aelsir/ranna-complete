import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import 'package:ranna/components/common/shimmer_loading.dart';
import 'package:ranna/models/collection.dart';
import 'package:ranna/theme/app_theme.dart';
import 'package:ranna/utils/format.dart';

/// Playlist / collection card for horizontal scroll lists on the home screen.
///
/// Shows a square cover image with an optional description subtitle.
/// Falls back to a gradient container with a music icon when no image is
/// available.
class CollectionCard extends StatelessWidget {
  final MusicCollection collection;
  final VoidCallback? onTap;

  const CollectionCard({
    super.key,
    required this.collection,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: SizedBox(
        width: 140,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Cover image
            Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                boxShadow: RannaTheme.shadowSm,
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: AspectRatio(
                  aspectRatio: 1,
                  child: CachedNetworkImage(
                    imageUrl: getImageUrl(collection.imageUrl),
                    fit: BoxFit.cover,
                    placeholder: (context, url) => const ShimmerBox(
                      width: double.infinity,
                      height: double.infinity,
                      borderRadius: 12,
                    ),
                    errorWidget: (context, url, error) => Container(
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(
                          colors: [RannaTheme.primary, RannaTheme.primaryGlow],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                      ),
                      child: const Center(
                        child: Icon(
                          Icons.queue_music,
                          color: Colors.white,
                          size: 40,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),
            // Collection name
            Text(
              collection.name,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            // Optional description
            if (collection.description != null)
              Text(
                collection.description!,
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: RannaTheme.mutedForeground,
                    ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
          ],
        ),
      ),
    );
  }
}
