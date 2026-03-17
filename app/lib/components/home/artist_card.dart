import 'package:flutter/material.dart';

import 'package:ranna/components/common/ranna_image.dart';
import 'package:ranna/models/madih.dart';
import 'package:ranna/theme/app_theme.dart';

/// Circular artist card for horizontal scroll lists on the home screen.
class ArtistCard extends StatefulWidget {
  final Madih artist;
  final VoidCallback? onTap;

  const ArtistCard({
    super.key,
    required this.artist,
    this.onTap,
  });

  @override
  State<ArtistCard> createState() => _ArtistCardState();
}

class _ArtistCardState extends State<ArtistCard> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => setState(() => _pressed = true),
      onTapUp: (_) {
        setState(() => _pressed = false);
        widget.onTap?.call();
      },
      onTapCancel: () => setState(() => _pressed = false),
      child: AnimatedScale(
        scale: _pressed ? 0.95 : 1.0,
        duration: const Duration(milliseconds: 150),
        curve: Curves.easeOutBack,
        child: SizedBox(
          width: 80,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 76,
                height: 76,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: Colors.transparent,
                    width: 2,
                  ),
                ),
                child: ClipOval(
                  child: RannaImage(
                    url: widget.artist.imageUrl,
                    width: 76,
                    height: 76,
                    fallbackWidget: _initialFallback(widget.artist.name),
                  ),
                ),
              ),
              const SizedBox(height: 6),
              SizedBox(
                width: 80,
                child: Text(
                  widget.artist.name,
                  style: const TextStyle(
                    fontFamily: RannaTheme.fontFustat,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: RannaTheme.foreground,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  static Widget _initialFallback(String name) {
    return Container(
      width: 76,
      height: 76,
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
