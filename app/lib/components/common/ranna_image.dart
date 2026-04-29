import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_cache_manager/flutter_cache_manager.dart';
import 'package:ranna/theme/app_theme.dart';
import 'package:ranna/utils/format.dart';

/// Custom cache manager with 30-day stale period for offline-first images.
final _rannaCacheManager = CacheManager(
  Config(
    'ranna_images',
    stalePeriod: const Duration(days: 30),
    maxNrOfCacheObjects: 500,
  ),
);

/// A network image widget that handles null/empty URLs gracefully,
/// resolves R2 relative paths, and works on both mobile and web.
///
/// If [url] is null/empty, shows [fallbackWidget] immediately without
/// attempting a network request.
class RannaImage extends StatelessWidget {
  final String? url;
  /// Optional thumbnail URL — loaded first for faster display on slow connections.
  /// The full-size image replaces it once loaded.
  final String? thumbnailUrl;
  final double width;
  final double height;
  final BoxFit fit;
  final Widget? fallbackWidget;
  final BorderRadius? borderRadius;

  const RannaImage({
    super.key,
    required this.url,
    this.thumbnailUrl,
    required this.width,
    required this.height,
    this.fit = BoxFit.cover,
    this.fallbackWidget,
    this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    final resolvedUrl = getImageUrl(url);

    // No URL available — show fallback immediately
    if (resolvedUrl.isEmpty) {
      return SizedBox(
        width: width,
        height: height,
        child: fallbackWidget ?? _defaultFallback(),
      );
    }

    // Cache images at the exact display size × device pixel ratio to save memory.
    // Skip cache sizing when dimensions are unbounded (e.g. double.infinity).
    final dpr = MediaQuery.devicePixelRatioOf(context);
    final cacheW = width.isFinite ? (width * dpr).round() : null;
    final cacheH = height.isFinite ? (height * dpr).round() : null;

    Widget image;
    // On web, use Image.network directly (CachedNetworkImage can have issues)
    if (kIsWeb) {
      image = Image.network(
        resolvedUrl,
        width: width,
        height: height,
        fit: fit,
        cacheWidth: cacheW,
        cacheHeight: cacheH,
        errorBuilder: (context, error, stackTrace) {
          assert(() {
            debugPrint('RannaImage: failed to load $resolvedUrl');
            return true;
          }());
          return SizedBox(
            width: width,
            height: height,
            child: fallbackWidget ?? _defaultFallback(),
          );
        },
        loadingBuilder: (context, child, loadingProgress) {
          if (loadingProgress == null) return child;
          return SizedBox(
            width: width,
            height: height,
            child: const Center(
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: RannaTheme.accent,
              ),
            ),
          );
        },
      );
    } else {
      // Resolve thumbnail URL for progressive loading
      final resolvedThumb = getImageUrl(thumbnailUrl);

      image = CachedNetworkImage(
        imageUrl: resolvedUrl,
        cacheManager: _rannaCacheManager,
        width: width,
        height: height,
        fit: fit,
        memCacheWidth: cacheW,
        memCacheHeight: cacheH,
        // Show thumbnail while full image loads (progressive loading)
        placeholder: resolvedThumb.isNotEmpty
            ? (context, url) => CachedNetworkImage(
                  imageUrl: resolvedThumb,
                  cacheManager: _rannaCacheManager,
                  width: width,
                  height: height,
                  fit: fit,
                  // Thumbnails are small — no memCache optimization needed
                )
            : null,
        errorWidget: (context, url, error) {
          assert(() {
            debugPrint('RannaImage: failed to load $url');
            return true;
          }());
          return SizedBox(
            width: width,
            height: height,
            child: fallbackWidget ?? _defaultFallback(),
          );
        },
      );
    }

    if (borderRadius != null) {
      return ClipRRect(borderRadius: borderRadius!, child: image);
    }
    return image;
  }

  Widget _defaultFallback() {
    // Ranna logo on a dark surface — the ultimate fallback for missing
    // images. Uses muted (#18181B) so the fallback reads as a card-like
    // surface instead of a glaring white square against the AMOLED scaffold.
    final logoSize = (width < height ? width : height) * 0.45;
    return Container(
      width: width,
      height: height,
      color: RannaTheme.muted,
      child: Center(
        child: Image.asset(
          'assets/images/logo-ranna.png',
          width: logoSize,
          height: logoSize,
          fit: BoxFit.contain,
          errorBuilder: (_, _, _) => Icon(
            Icons.music_note,
            color: RannaTheme.primary.withValues(alpha: 0.3),
            size: logoSize,
          ),
        ),
      ),
    );
  }
}
