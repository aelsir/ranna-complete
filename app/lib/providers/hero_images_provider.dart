/// Active landing-page hero images managed via the dashboard. Reads from
/// `hero_images` filtered by `is_active = true`, ordered by display_order.
///
/// Intentionally NOT disk-cached: the table is tiny (1–5 rows) and admins
/// expect uploads to appear in the app immediately, not an hour later.
/// Riverpod's FutureProvider memoises the result for the current session,
/// and `Image.network` caches the image bytes themselves, so the only
/// cost of skipping the cache is a single small Supabase request on
/// each cold launch.
///
/// To force a refresh from the home screen (e.g. pull-to-refresh), call
/// `ref.invalidate(heroImagesProvider)`.
library;

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:ranna/models/hero_image.dart';

import 'supabase_internals.dart';

final heroImagesProvider = FutureProvider<List<HeroImage>>((ref) async {
  final supabase = ref.read(supabaseProvider);
  try {
    final dynamic results = await supabase
        .from('hero_images')
        .select()
        .eq('is_active', true)
        .order('display_order', ascending: true);
    return asList(results)
        .map((e) => HeroImage.fromJson(e))
        .toList();
  } catch (e) {
    debugPrint('⛔ heroImagesProvider error: $e');
    return <HeroImage>[];
  }
});
