import 'package:flutter/material.dart';

import 'package:ranna/components/common/ranna_image.dart';
import 'package:ranna/models/collection.dart';
import 'package:ranna/theme/app_theme.dart';

/// Playlist / collection card for horizontal scroll lists on the home screen.
class CollectionCard extends StatelessWidget {
  final MusicCollection collection;
  final VoidCallback? onTap;
  final VoidCallback? onPlay;

  const CollectionCard({
    super.key,
    required this.collection,
    this.onTap,
    this.onPlay,
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
            // Square image with play button overlay
            Stack(
              children: [
                Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(RannaTheme.radius2xl),
                    boxShadow: RannaTheme.shadowCard,
                    border: Border.all(
                      color: RannaTheme.border.withValues(alpha: 0.2),
                      width: 1,
                    ),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(RannaTheme.radius2xl),
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
                // Play button at bottom-start
                PositionedDirectional(
                  bottom: 8,
                  start: 8,
                  child: GestureDetector(
                    onTap: onPlay ?? onTap,
                    child: Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: RannaTheme.secondary,
                        shape: BoxShape.circle,
                        boxShadow: RannaTheme.shadowGlowSecondary,
                      ),
                      child: Icon(
                        RannaTheme.playIcon,
                        color: RannaTheme.secondaryForeground,
                        size: 20,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              collection.name,
              style: const TextStyle(
                fontFamily: RannaTheme.fontFustat,
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: RannaTheme.foreground,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            if (collection.description != null)
              Text(
                collection.description!,
                style: const TextStyle(
                  fontFamily: RannaTheme.fontFustat,
                  fontSize: 10,
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
