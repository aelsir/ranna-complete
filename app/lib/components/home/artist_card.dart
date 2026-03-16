import 'package:flutter/material.dart';

import 'package:ranna/components/common/ranna_image.dart';
import 'package:ranna/models/madih.dart';
import 'package:ranna/theme/app_theme.dart';

/// Circular artist card for horizontal scroll lists on the home screen.
class ArtistCard extends StatelessWidget {
  final Madih artist;
  final VoidCallback? onTap;

  const ArtistCard({
    super.key,
    required this.artist,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: SizedBox(
        width: 80,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircleAvatar(
              radius: 32,
              backgroundColor: RannaTheme.muted,
              child: ClipOval(
                child: RannaImage(
                  url: artist.imageUrl,
                  width: 64,
                  height: 64,
                  fallbackWidget: _initialFallback(artist.name),
                ),
              ),
            ),
            const SizedBox(height: 6),
            Text(
              artist.name,
              style: Theme.of(context).textTheme.labelSmall,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  static Widget _initialFallback(String name) {
    return Container(
      width: 64,
      height: 64,
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
            fontSize: 20,
          ),
        ),
      ),
    );
  }
}
