import 'package:flutter/material.dart';

import 'package:ranna/components/common/ranna_image.dart';
import 'package:ranna/models/collection.dart';
import 'package:ranna/theme/app_theme.dart';

/// Playlist / collection card for horizontal scroll lists on the home screen.
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
            Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                boxShadow: RannaTheme.shadowSm,
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: AspectRatio(
                  aspectRatio: 1,
                  child: RannaImage(
                    url: collection.imageUrl,
                    width: 140,
                    height: 140,
                    fallbackWidget: Container(
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(
                          colors: [RannaTheme.primary, RannaTheme.primaryGlow],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                      ),
                      child: const Center(
                        child: Icon(Icons.queue_music, color: Colors.white, size: 40),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              collection.name,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
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
