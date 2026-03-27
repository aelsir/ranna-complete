import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:ranna/theme/app_theme.dart';
import 'package:ranna/utils/format.dart';

/// A network image widget that handles null/empty URLs gracefully,
/// resolves R2 relative paths, and works on both mobile and web.
///
/// If [url] is null/empty, shows [fallbackWidget] immediately without
/// attempting a network request.
class RannaImage extends StatelessWidget {
  final String? url;
  final double width;
  final double height;
  final BoxFit fit;
  final Widget? fallbackWidget;
  final BorderRadius? borderRadius;

  const RannaImage({
    super.key,
    required this.url,
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
          assert(() { debugPrint('RannaImage: failed to load $resolvedUrl'); return true; }());
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
      image = CachedNetworkImage(
        imageUrl: resolvedUrl,
        width: width,
        height: height,
        fit: fit,
        memCacheWidth: cacheW,
        memCacheHeight: cacheH,
        errorWidget: (context, url, error) {
          assert(() { debugPrint('RannaImage: failed to load $url'); return true; }());
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
    // Ranna logo on white background as the ultimate fallback
    final logoSize = (width < height ? width : height) * 0.45;
    return Container(
      width: width,
      height: height,
      color: Colors.white,
      child: Center(
        child: Image.asset(
          'assets/images/logo-ranna.png',
          width: logoSize,
          height: logoSize,
          fit: BoxFit.contain,
          errorBuilder: (_, __, ___) => Icon(
            Icons.music_note,
            color: RannaTheme.primary.withValues(alpha: 0.3),
            size: logoSize,
          ),
        ),
      ),
    );
  }
}
