import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:ranna/models/madha.dart';
import 'package:ranna/models/madih.dart';
import 'package:ranna/models/rawi.dart';
import 'package:ranna/models/tariqa.dart';
import 'package:ranna/models/fan.dart';
import 'package:ranna/models/collection.dart';
import 'package:ranna/providers/favorites_provider.dart';
import 'package:ranna/utils/lyrics.dart';

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

/// Safely parse a JSON map from an RPC response.
Map<String, dynamic>? _asMap(dynamic result) {
  if (result == null) return null;
  if (result is Map<String, dynamic>) return result;
  if (result is Map) return Map<String, dynamic>.from(result);
  return null;
}

// ============================================
// Home page data — single RPC call
// ============================================

final homeDataProvider = FutureProvider<HomeData>((ref) async {
  ref.keepAlive();
  final supabase = ref.read(supabaseProvider);

  try {
    final dynamic result = await supabase.rpc('get_home_data', params: {'p_limit': 10});
    final data = _asMap(result);

    if (data == null) {
      debugPrint('⛔ homeDataProvider: get_home_data returned null');
      return const HomeData(
        featuredTracks: [],
        popularTracks: [],
        recentTracks: [],
        artists: [],
        collections: [],
        narrators: [],
      );
    }

    debugPrint('✅ homeDataProvider: got home data from RPC');

    final totalTracks = data['total_tracks'] as int? ?? 0;
    final trending = _asList(data['trending']);
    final featured = _asList(data['featured']);
    final recent = _asList(data['recent']);
    final artists = _asList(data['artists']);
    final narrators = _asList(data['narrators']);
    final collections = _asList(data['collections']);

    return HomeData(
      totalTracks: totalTracks,
      popularTracks: trending.map((e) => MadhaWithRelations.fromJson(e)).toList(),
      featuredTracks: featured.map((e) => MadhaWithRelations.fromJson(e)).toList(),
      recentTracks: recent.map((e) => MadhaWithRelations.fromJson(e)).toList(),
      artists: artists.map((e) => Madih.fromJson(e)).toList(),
      collections: collections.map((e) => MusicCollection.fromJson(e)).toList(),
      narrators: narrators.map((e) => Rawi.fromJson(e)).toList(),
    );
  } catch (e, st) {
    debugPrint('⛔ homeDataProvider error: $e');
    debugPrint('$st');
    return const HomeData(
      featuredTracks: [],
      popularTracks: [],
      recentTracks: [],
      artists: [],
      collections: [],
      narrators: [],
    );
  }
});

class HomeData {
  final int totalTracks;
  final List<MadhaWithRelations> featuredTracks;
  final List<MadhaWithRelations> popularTracks;
  final List<MadhaWithRelations> recentTracks;
  final List<Madih> artists;
  final List<MusicCollection> collections;
  final List<Rawi> narrators;

  const HomeData({
    this.totalTracks = 0,
    required this.featuredTracks,
    required this.popularTracks,
    required this.recentTracks,
    required this.artists,
    required this.collections,
    required this.narrators,
  });
}

// ============================================
// Search — single RPC call
// ============================================

enum SearchFilter { all, madha, kalimat, madih, rawi }

final searchQueryProvider = StateProvider<String>((ref) => '');
final searchFilterProvider = StateProvider<SearchFilter>((ref) => SearchFilter.all);

/// A unified search result that can be a track, artist, or narrator.
class SearchResult {
  final SearchResultType type;
  final String id;
  final String name;
  final String? subtitle;
  final String? imageUrl;
  final MadhaWithRelations? track;
  final String? lyricsSnippet;

  const SearchResult({
    required this.type,
    required this.id,
    required this.name,
    this.subtitle,
    this.imageUrl,
    this.track,
    this.lyricsSnippet,
  });
}

enum SearchResultType { madha, kalimat, madih, rawi }

/// Always returns ALL categories so the UI can compute counts per type.
/// Filtering by SearchFilter happens in the UI layer, not here.
final searchResultsProvider = FutureProvider<List<SearchResult>>((ref) async {
  final query = ref.watch(searchQueryProvider);
  // Note: we deliberately ignore searchFilterProvider here — always fetch all categories.
  // The UI filters and counts from the full list.
  if (query.trim().isEmpty) return [];

  final supabase = ref.read(supabaseProvider);
  final List<SearchResult> results = [];

  try {
    final dynamic rpcResult = await supabase.rpc('search_all', params: {
      'p_query': query,
      'p_limit': 30,
    });

    final data = _asMap(rpcResult);
    if (data == null) return [];

    // Track results (title/madih/writer match)
    final tracks = _asList(data['tracks']);
    for (final t in tracks) {
      final track = MadhaWithRelations.fromJson(t);
      results.add(SearchResult(
        type: SearchResultType.madha,
        id: track.id,
        name: track.title,
        subtitle: track.madihDetails?.name ?? track.madih,
        imageUrl: track.resolvedImageUrl,
        track: track,
      ));
    }

    // Lyrics-only results
    final lyrics = _asList(data['lyrics']);
    for (final t in lyrics) {
      final track = MadhaWithRelations.fromJson(t);
      final snippet = extractLyricsSnippet(track.lyrics, query);
      results.add(SearchResult(
        type: SearchResultType.kalimat,
        id: track.id,
        name: track.title,
        subtitle: track.madihDetails?.name ?? track.madih,
        imageUrl: track.resolvedImageUrl,
        track: track,
        lyricsSnippet: snippet,
      ));
    }

    // Artist results
    final artists = _asList(data['artists']);
    for (final a in artists) {
      final artist = Madih.fromJson(a);
      results.add(SearchResult(
        type: SearchResultType.madih,
        id: artist.id,
        name: artist.name,
        subtitle: 'مادح · ${artist.trackCount} مدحة',
        imageUrl: artist.imageUrl,
      ));
    }

    // Narrator results
    final narrators = _asList(data['narrators']);
    for (final n in narrators) {
      final narrator = Rawi.fromJson(n);
      results.add(SearchResult(
        type: SearchResultType.rawi,
        id: narrator.id,
        name: narrator.name,
        subtitle: 'راوي · ${narrator.trackCount} مدحة',
        imageUrl: narrator.imageUrl,
      ));
    }

    debugPrint('🔍 search: ${results.length} results for "$query"');
    return results;
  } catch (e, st) {
    debugPrint('⛔ searchResultsProvider error: $e');
    debugPrint('$st');
    return [];
  }
});

// ============================================
// Favorites — uses v_tracks view
// ============================================

final favoriteTracksProvider = FutureProvider<List<MadhaWithRelations>>((ref) async {
  ref.keepAlive();
  final favoriteIds = ref.watch(favoritesProvider);
  if (favoriteIds.isEmpty) return [];

  final supabase = ref.read(supabaseProvider);
  try {
    final dynamic results = await supabase
        .from('v_tracks')
        .select()
        .inFilter('id', favoriteIds.toList())
        .order('created_at', ascending: false);
    final list = _asList(results);
    return list.map((e) => MadhaWithRelations.fromJson(e)).toList();
  } catch (e, st) {
    debugPrint('⛔ favoriteTracksProvider error: $e');
    debugPrint('$st');
    return [];
  }
});

// ============================================
// Artists (Madiheen) — uses v_artists view
// ============================================

final allArtistsProvider = FutureProvider<List<Madih>>((ref) async {
  final supabase = ref.read(supabaseProvider);
  try {
    final dynamic results = await supabase
        .from('v_artists')
        .select()
        .order('name');
    return _asList(results).map((e) => Madih.fromJson(e)).toList();
  } catch (e) {
    debugPrint('⛔ allArtistsProvider error: $e');
    return [];
  }
});

const _artistsPageSize = 30;

final paginatedArtistsProvider =
    FutureProvider.family<List<Madih>, int>((ref, page) async {
  ref.keepAlive();
  final supabase = ref.read(supabaseProvider);
  try {
    final from = page * _artistsPageSize;
    final to = from + _artistsPageSize - 1;
    final dynamic results = await supabase
        .from('v_artists')
        .select()
        .order('name')
        .range(from, to);
    return _asList(results).map((e) => Madih.fromJson(e)).toList();
  } catch (e) {
    debugPrint('⛔ paginatedArtistsProvider error: $e');
    return [];
  }
});

/// Artist profile + tracks via RPC
final artistTracksProvider =
    FutureProvider.family<List<MadhaWithRelations>, String>((ref, artistId) async {
  final supabase = ref.read(supabaseProvider);
  try {
    final dynamic result = await supabase.rpc('get_artist_profile', params: {
      'p_artist_id': artistId,
    });
    final data = _asMap(result);
    if (data == null) return [];
    return _asList(data['tracks']).map((e) => MadhaWithRelations.fromJson(e)).toList();
  } catch (e) {
    debugPrint('⛔ artistTracksProvider error: $e');
    return [];
  }
});

final artistDetailProvider = FutureProvider.family<Madih?, String>((ref, id) async {
  final supabase = ref.read(supabaseProvider);
  try {
    final result = await supabase.from('v_artists').select().eq('id', id).maybeSingle();
    if (result == null) return null;
    return Madih.fromJson(result);
  } catch (e) {
    debugPrint('⛔ artistDetailProvider error: $e');
    return null;
  }
});

// ============================================
// Narrators (Ruwat) — uses v_narrators view
// ============================================

final allNarratorsProvider = FutureProvider<List<Rawi>>((ref) async {
  final supabase = ref.read(supabaseProvider);
  try {
    final dynamic results = await supabase
        .from('v_narrators')
        .select()
        .order('name');
    return _asList(results).map((e) => Rawi.fromJson(e)).toList();
  } catch (e) {
    debugPrint('⛔ allNarratorsProvider error: $e');
    return [];
  }
});

const _narratorsPageSize = 30;

final paginatedNarratorsProvider =
    FutureProvider.family<List<Rawi>, int>((ref, page) async {
  ref.keepAlive();
  final supabase = ref.read(supabaseProvider);
  try {
    final from = page * _narratorsPageSize;
    final to = from + _narratorsPageSize - 1;
    final dynamic results = await supabase
        .from('v_narrators')
        .select()
        .order('name')
        .range(from, to);
    return _asList(results).map((e) => Rawi.fromJson(e)).toList();
  } catch (e) {
    debugPrint('⛔ paginatedNarratorsProvider error: $e');
    return [];
  }
});

/// Narrator profile + tracks via RPC
final narratorTracksProvider =
    FutureProvider.family<List<MadhaWithRelations>, String>((ref, rawiId) async {
  final supabase = ref.read(supabaseProvider);
  try {
    final dynamic result = await supabase.rpc('get_narrator_profile', params: {
      'p_narrator_id': rawiId,
    });
    final data = _asMap(result);
    if (data == null) return [];
    return _asList(data['tracks']).map((e) => MadhaWithRelations.fromJson(e)).toList();
  } catch (e) {
    debugPrint('⛔ narratorTracksProvider error: $e');
    return [];
  }
});

final narratorDetailProvider = FutureProvider.family<Rawi?, String>((ref, id) async {
  final supabase = ref.read(supabaseProvider);
  try {
    final result = await supabase.from('v_narrators').select().eq('id', id).maybeSingle();
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
// Collections — uses v_collections view + RPC
// ============================================

final allCollectionsProvider = FutureProvider<List<MusicCollection>>((ref) async {
  final supabase = ref.read(supabaseProvider);
  try {
    final dynamic results = await supabase
        .from('v_collections')
        .select()
        .order('display_order');
    return _asList(results).map((e) => MusicCollection.fromJson(e)).toList();
  } catch (e) {
    debugPrint('⛔ allCollectionsProvider error: $e');
    return [];
  }
});

/// Collection tracks via RPC — returns ordered tracks with full joins
final collectionTracksProvider =
    FutureProvider.family<List<MadhaWithRelations>, String>((ref, collectionId) async {
  final supabase = ref.read(supabaseProvider);
  try {
    final dynamic result = await supabase.rpc('get_collection_tracks', params: {
      'p_collection_id': collectionId,
    });
    return _asList(result).map((e) => MadhaWithRelations.fromJson(e)).toList();
  } catch (e) {
    debugPrint('⛔ collectionTracksProvider error: $e');
    return [];
  }
});

final collectionDetailProvider =
    FutureProvider.family<MusicCollection?, String>((ref, id) async {
  final supabase = ref.read(supabaseProvider);
  try {
    final result = await supabase.from('v_collections').select().eq('id', id).maybeSingle();
    if (result == null) return null;
    return MusicCollection.fromJson(result);
  } catch (e) {
    debugPrint('⛔ collectionDetailProvider error: $e');
    return null;
  }
});

// ============================================
// Tracks by filter — uses v_tracks view
// ============================================

final tracksByTariqaProvider =
    FutureProvider.family<List<MadhaWithRelations>, String>((ref, tariqaId) async {
  final supabase = ref.read(supabaseProvider);
  try {
    final dynamic results = await supabase
        .from('v_tracks')
        .select()
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
        .from('v_tracks')
        .select()
        .eq('fan_id', fanId)
        .order('created_at', ascending: false);
    return _asList(results).map((e) => MadhaWithRelations.fromJson(e)).toList();
  } catch (e) {
    debugPrint('⛔ tracksByFanProvider error: $e');
    return [];
  }
});
