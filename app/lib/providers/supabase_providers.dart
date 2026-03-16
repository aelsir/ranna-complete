import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:ranna/models/madha.dart';
import 'package:ranna/models/madih.dart';
import 'package:ranna/models/rawi.dart';
import 'package:ranna/models/tariqa.dart';
import 'package:ranna/models/fan.dart';
import 'package:ranna/models/collection.dart';

final supabaseProvider = Provider<SupabaseClient>((ref) {
  return Supabase.instance.client;
});

/// Safely converts any Supabase query result to a typed list.
/// Handles null (web bug), empty responses, and unexpected types.
List<Map<String, dynamic>> _asList(dynamic result) {
  if (result == null) {
    debugPrint('⚠️  _asList: received null');
    return [];
  }
  if (result is! List) {
    debugPrint('⚠️  _asList: expected List, got ${result.runtimeType}: $result');
    return [];
  }
  return result.whereType<Map<String, dynamic>>().toList();
}

// ============================================
// Home page data
// ============================================

final homeDataProvider = FutureProvider<HomeData>((ref) async {
  final supabase = ref.read(supabaseProvider);

  Future<List<Map<String, dynamic>>> safeQuery(
      String label, Future<dynamic> Function() query) async {
    try {
      final dynamic result = await query();
      final list = _asList(result);
      debugPrint('✅ homeDataProvider [$label]: ${list.length} rows');
      return list;
    } catch (e, st) {
      debugPrint('⛔ homeDataProvider [$label] error: $e');
      debugPrint('$st');
      return [];
    }
  }

  // Use select('*') without joins to avoid PostgREST embedding issues on web.
  // Artist/narrator details are fetched lazily via separate providers when needed.
  final featuredRaw = await safeQuery('featured', () => supabase
      .from('madha')
      .select()
      .eq('status', 'approved')
      .eq('is_featured', true)
      .order('created_at', ascending: false)
      .limit(10));

  final popularRaw = await safeQuery('popular', () => supabase
      .from('madha')
      .select()
      .eq('status', 'approved')
      .order('play_count', ascending: false)
      .limit(10));

  final recentRaw = await safeQuery('recent', () => supabase
      .from('madha')
      .select()
      .eq('status', 'approved')
      .order('created_at', ascending: false)
      .limit(10));

  final artistsRaw = await safeQuery('artists', () => supabase
      .from('madiheen')
      .select()
      .eq('status', 'approved')
      .order('name')
      .limit(20));

  final collectionsRaw = await safeQuery('collections', () => supabase
      .from('collections')
      .select()
      .eq('is_active', true)
      .order('display_order'));

  final narratorsRaw = await safeQuery('narrators', () => supabase
      .from('ruwat')
      .select()
      .eq('status', 'approved')
      .order('name')
      .limit(20));

  // Build a lookup of madih image URLs so tracks without their own image
  // can fall back to the madih's photo.
  final artistImageMap = <String, String>{};
  for (final a in artistsRaw) {
    final id = a['id'] as String?;
    final img = a['image_url'] as String?;
    if (id != null && img != null && img.isNotEmpty) {
      artistImageMap[id] = img;
    }
  }

  List<Map<String, dynamic>> enrichWithMadihImage(
      List<Map<String, dynamic>> tracks) {
    return tracks.map((t) {
      final imageUrl = t['image_url'] as String?;
      if (imageUrl != null && imageUrl.isNotEmpty) return t;
      final madihId = t['madih_id'] as String?;
      if (madihId != null && artistImageMap.containsKey(madihId)) {
        return {...t, 'image_url': artistImageMap[madihId]};
      }
      return t;
    }).toList();
  }

  return HomeData(
    featuredTracks: enrichWithMadihImage(featuredRaw).map((e) => MadhaWithRelations.fromJson(e)).toList(),
    popularTracks: enrichWithMadihImage(popularRaw).map((e) => MadhaWithRelations.fromJson(e)).toList(),
    recentTracks: enrichWithMadihImage(recentRaw).map((e) => MadhaWithRelations.fromJson(e)).toList(),
    artists: artistsRaw.map((e) => Madih.fromJson(e)).toList(),
    collections: collectionsRaw.map((e) => MusicCollection.fromJson(e)).toList(),
    narrators: narratorsRaw.map((e) => Rawi.fromJson(e)).toList(),
  );
});

class HomeData {
  final List<MadhaWithRelations> featuredTracks;
  final List<MadhaWithRelations> popularTracks;
  final List<MadhaWithRelations> recentTracks;
  final List<Madih> artists;
  final List<MusicCollection> collections;
  final List<Rawi> narrators;

  const HomeData({
    required this.featuredTracks,
    required this.popularTracks,
    required this.recentTracks,
    required this.artists,
    required this.collections,
    required this.narrators,
  });
}

// ============================================
// Search
// ============================================

final searchQueryProvider = StateProvider<String>((ref) => '');

final searchResultsProvider = FutureProvider<List<MadhaWithRelations>>((ref) async {
  final query = ref.watch(searchQueryProvider);
  if (query.trim().isEmpty) return [];

  final supabase = ref.read(supabaseProvider);
  try {
    // Use ilike on title only — avoids .or() which can fail on web.
    // Also no joins to avoid PostgREST embedding issues.
    final dynamic results = await supabase
        .from('madha')
        .select()
        .eq('status', 'approved')
        .ilike('title', '%$query%')
        .order('play_count', ascending: false)
        .limit(50);

    debugPrint('🔍 searchResultsProvider raw type: ${results.runtimeType}');
    final list = _asList(results);
    debugPrint('🔍 searchResultsProvider: ${list.length} results for "$query"');
    return list.map((e) => MadhaWithRelations.fromJson(e)).toList();
  } catch (e, st) {
    debugPrint('⛔ searchResultsProvider error: $e');
    debugPrint('$st');
    return [];
  }
});

// ============================================
// Artists (Madiheen)
// ============================================

final allArtistsProvider = FutureProvider<List<Madih>>((ref) async {
  final supabase = ref.read(supabaseProvider);
  try {
    final dynamic results = await supabase
        .from('madiheen')
        .select()
        .eq('status', 'approved')
        .order('name');
    return _asList(results).map((e) => Madih.fromJson(e)).toList();
  } catch (e) {
    debugPrint('⛔ allArtistsProvider error: $e');
    return [];
  }
});

final artistTracksProvider =
    FutureProvider.family<List<MadhaWithRelations>, String>((ref, artistId) async {
  final supabase = ref.read(supabaseProvider);
  try {
    // Fetch the artist's image to use as fallback for tracks without images.
    final artistResult =
        await supabase.from('madiheen').select('image_url').eq('id', artistId).maybeSingle();
    final artistImage = artistResult?['image_url'] as String?;

    final dynamic results = await supabase
        .from('madha')
        .select()
        .eq('status', 'approved')
        .eq('madih_id', artistId)
        .order('created_at', ascending: false);

    return _asList(results).map((e) {
      final trackImage = e['image_url'] as String?;
      if ((trackImage == null || trackImage.isEmpty) &&
          artistImage != null &&
          artistImage.isNotEmpty) {
        return MadhaWithRelations.fromJson({...e, 'image_url': artistImage});
      }
      return MadhaWithRelations.fromJson(e);
    }).toList();
  } catch (e) {
    debugPrint('⛔ artistTracksProvider error: $e');
    return [];
  }
});

final artistDetailProvider = FutureProvider.family<Madih?, String>((ref, id) async {
  final supabase = ref.read(supabaseProvider);
  try {
    final result = await supabase.from('madiheen').select().eq('id', id).maybeSingle();
    if (result == null) return null;
    return Madih.fromJson(result);
  } catch (e) {
    debugPrint('⛔ artistDetailProvider error: $e');
    return null;
  }
});

// ============================================
// Narrators (Ruwat)
// ============================================

final allNarratorsProvider = FutureProvider<List<Rawi>>((ref) async {
  final supabase = ref.read(supabaseProvider);
  try {
    final dynamic results = await supabase
        .from('ruwat')
        .select()
        .eq('status', 'approved')
        .order('name');
    return _asList(results).map((e) => Rawi.fromJson(e)).toList();
  } catch (e) {
    debugPrint('⛔ allNarratorsProvider error: $e');
    return [];
  }
});

final narratorTracksProvider =
    FutureProvider.family<List<MadhaWithRelations>, String>((ref, rawiId) async {
  final supabase = ref.read(supabaseProvider);
  try {
    final dynamic results = await supabase
        .from('madha')
        .select()
        .eq('status', 'approved')
        .eq('rawi_id', rawiId)
        .order('created_at', ascending: false);
    return _asList(results).map((e) => MadhaWithRelations.fromJson(e)).toList();
  } catch (e) {
    debugPrint('⛔ narratorTracksProvider error: $e');
    return [];
  }
});

final narratorDetailProvider = FutureProvider.family<Rawi?, String>((ref, id) async {
  final supabase = ref.read(supabaseProvider);
  try {
    final result = await supabase.from('ruwat').select().eq('id', id).maybeSingle();
    if (result == null) return null;
    return Rawi.fromJson(result);
  } catch (e) {
    debugPrint('⛔ narratorDetailProvider error: $e');
    return null;
  }
});

// ============================================
// Sufi Orders (Turuq)
// ============================================

final allTuruqProvider = FutureProvider<List<Tariqa>>((ref) async {
  final supabase = ref.read(supabaseProvider);
  try {
    final dynamic results = await supabase.from('turuq').select().order('name');
    return _asList(results).map((e) => Tariqa.fromJson(e)).toList();
  } catch (e) {
    debugPrint('⛔ allTuruqProvider error: $e');
    return [];
  }
});

// ============================================
// Music Styles (Funun)
// ============================================

final allFununProvider = FutureProvider<List<Fan>>((ref) async {
  final supabase = ref.read(supabaseProvider);
  try {
    final dynamic results = await supabase.from('funun').select().order('name');
    return _asList(results).map((e) => Fan.fromJson(e)).toList();
  } catch (e) {
    debugPrint('⛔ allFununProvider error: $e');
    return [];
  }
});

// ============================================
// Collections
// ============================================

final allCollectionsProvider = FutureProvider<List<MusicCollection>>((ref) async {
  final supabase = ref.read(supabaseProvider);
  try {
    final dynamic results = await supabase
        .from('collections')
        .select()
        .eq('is_active', true)
        .order('display_order');
    return _asList(results).map((e) => MusicCollection.fromJson(e)).toList();
  } catch (e) {
    debugPrint('⛔ allCollectionsProvider error: $e');
    return [];
  }
});

final collectionTracksProvider =
    FutureProvider.family<List<MadhaWithRelations>, String>((ref, collectionId) async {
  final supabase = ref.read(supabaseProvider);
  try {
    final dynamic items = await supabase
        .from('collection_items')
        .select('madha_id, position')
        .eq('collection_id', collectionId)
        .order('position');

    final itemList = _asList(items);
    if (itemList.isEmpty) return [];

    final madhaIds = itemList
        .map((e) => e['madha_id'] as String?)
        .whereType<String>()
        .toList();

    if (madhaIds.isEmpty) return [];

    final dynamic tracks = await supabase
        .from('madha')
        .select()
        .inFilter('id', madhaIds)
        .eq('status', 'approved');

    return _asList(tracks).map((e) => MadhaWithRelations.fromJson(e)).toList();
  } catch (e) {
    debugPrint('⛔ collectionTracksProvider error: $e');
    return [];
  }
});

final collectionDetailProvider =
    FutureProvider.family<MusicCollection?, String>((ref, id) async {
  final supabase = ref.read(supabaseProvider);
  try {
    final result = await supabase.from('collections').select().eq('id', id).maybeSingle();
    if (result == null) return null;
    return MusicCollection.fromJson(result);
  } catch (e) {
    debugPrint('⛔ collectionDetailProvider error: $e');
    return null;
  }
});

// ============================================
// Tracks by filter
// ============================================

final tracksByTariqaProvider =
    FutureProvider.family<List<MadhaWithRelations>, String>((ref, tariqaId) async {
  final supabase = ref.read(supabaseProvider);
  try {
    final dynamic results = await supabase
        .from('madha')
        .select()
        .eq('status', 'approved')
        .eq('tariqa_id', tariqaId)
        .order('created_at', ascending: false);
    return _asList(results).map((e) => MadhaWithRelations.fromJson(e)).toList();
  } catch (e) {
    debugPrint('⛔ tracksByTariqaProvider error: $e');
    return [];
  }
});

final tracksByFanProvider =
    FutureProvider.family<List<MadhaWithRelations>, String>((ref, fanId) async {
  final supabase = ref.read(supabaseProvider);
  try {
    final dynamic results = await supabase
        .from('madha')
        .select()
        .eq('status', 'approved')
        .eq('fan_id', fanId)
        .order('created_at', ascending: false);
    return _asList(results).map((e) => MadhaWithRelations.fromJson(e)).toList();
  } catch (e) {
    debugPrint('⛔ tracksByFanProvider error: $e');
    return [];
  }
});
