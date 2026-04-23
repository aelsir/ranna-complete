import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
// Hide supabase_flutter's AuthState so our `auth_notifier.dart` export wins.
import 'package:supabase_flutter/supabase_flutter.dart' hide AuthState;
import 'package:ranna/models/madha.dart';
import 'package:ranna/models/madih.dart';
import 'package:ranna/models/rawi.dart';
import 'package:ranna/models/tariqa.dart';
import 'package:ranna/models/fan.dart';
import 'package:ranna/models/collection.dart';
import 'package:ranna/providers/favorites_provider.dart';
import 'package:ranna/providers/auth_notifier.dart';
import 'package:ranna/services/cache_service.dart';
import 'package:ranna/utils/lyrics.dart';

final _cache = CacheService();

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

HomeData _parseHomeData(Map<String, dynamic> data) {
  return HomeData(
    totalTracks: data['total_tracks'] as int? ?? 0,
    popularTracks: _asList(data['trending']).map((e) => MadhaWithRelations.fromJson(e)).toList(),
    featuredTracks: _asList(data['featured']).map((e) => MadhaWithRelations.fromJson(e)).toList(),
    recentTracks: _asList(data['recent']).map((e) => MadhaWithRelations.fromJson(e)).toList(),
    artists: _asList(data['artists']).map((e) => Madih.fromJson(e)).toList(),
    collections: _asList(data['collections']).map((e) => MusicCollection.fromJson(e)).toList(),
    narrators: _asList(data['narrators']).map((e) => Rawi.fromJson(e)).toList(),
  );
}

final homeDataProvider = FutureProvider<HomeData>((ref) async {
  ref.keepAlive();
  final supabase = ref.read(supabaseProvider);

  return _cache.fetch<HomeData>(
    key: 'home_data',
    maxAge: const Duration(hours: 1),
    fetcher: () async {
      final dynamic result = await supabase.rpc('get_home_data', params: {'p_limit': 10});
      final data = _asMap(result);
      if (data == null) throw Exception('get_home_data returned null');
      debugPrint('✅ homeDataProvider: fetched fresh from RPC');
      return _parseHomeData(data);
    },
    serialize: (homeData) => jsonEncode({
      'total_tracks': homeData.totalTracks,
      'trending': homeData.popularTracks.map((t) => t.toJsonCache()).toList(),
      'featured': homeData.featuredTracks.map((t) => t.toJsonCache()).toList(),
      'recent': homeData.recentTracks.map((t) => t.toJsonCache()).toList(),
      'artists': homeData.artists.map((a) => a.toJsonCache()).toList(),
      'collections': homeData.collections.map((c) => c.toJsonCache()).toList(),
      'narrators': homeData.narrators.map((n) => n.toJsonCache()).toList(),
    }),
    deserialize: (json) {
      final data = jsonDecode(json) as Map<String, dynamic>;
      debugPrint('📦 homeDataProvider: loaded from cache');
      return _parseHomeData(data);
    },
  );
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
// Listening History — "Continue Listening" section
// ============================================

final listeningHistoryProvider = FutureProvider<List<MadhaWithRelations>>((ref) async {
  final supabase = ref.read(supabaseProvider);
  // Re-fetch whenever the auth identity changes (anon bootstrap, login,
  // logout + re-anon). Without this watch, the provider would cache the
  // empty "null user" result indefinitely.
  final authUser = ref.watch(authNotifierProvider.select((s) => s.user));
  try {
    if (authUser == null) return [];
    final user = supabase.auth.currentUser ?? authUser;

    // Fetch the 10 most recently listened tracks
    final dynamic historyRows = await supabase
        .from('v_recent_listens')
        .select('track_id')
        .eq('user_id', user.id)
        .order('listened_at', ascending: false)
        .limit(10);

    final trackIds = _asList(historyRows).map((r) => r['track_id'] as String).toList();
    if (trackIds.isEmpty) return [];

    // Fetch full track data via v_tracks
    final dynamic tracksData = await supabase
        .from('v_tracks')
        .select()
        .inFilter('id', trackIds);

    final tracks = _asList(tracksData).map((e) => MadhaWithRelations.fromJson(e)).toList();

    // Preserve listening history order (most recent first)
    final byId = {for (final t in tracks) t.id: t};
    return trackIds
        .map((id) => byId[id])
        .whereType<MadhaWithRelations>()
        .toList();
  } catch (e, st) {
    debugPrint('⛔ listeningHistoryProvider error: $e');
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
  return _cache.fetch<List<MadhaWithRelations>>(
    key: 'artist_tracks:$artistId',
    maxAge: const Duration(hours: 24),
    fetcher: () async {
      final dynamic result = await supabase.rpc('get_artist_profile', params: {
        'p_artist_id': artistId,
      });
      final data = _asMap(result);
      if (data == null) return <MadhaWithRelations>[];
      return _asList(data['tracks']).map((e) => MadhaWithRelations.fromJson(e)).toList();
    },
    serialize: (tracks) => jsonEncode(tracks.map((t) => t.toJsonCache()).toList()),
    deserialize: (json) => (jsonDecode(json) as List)
        .map((e) => MadhaWithRelations.fromJson(e as Map<String, dynamic>))
        .toList(),
  );
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
  return _cache.fetch<List<MadhaWithRelations>>(
    key: 'narrator_tracks:$rawiId',
    maxAge: const Duration(hours: 24),
    fetcher: () async {
      final dynamic result = await supabase.rpc('get_narrator_profile', params: {
        'p_narrator_id': rawiId,
      });
      final data = _asMap(result);
      if (data == null) return <MadhaWithRelations>[];
      return _asList(data['tracks']).map((e) => MadhaWithRelations.fromJson(e)).toList();
    },
    serialize: (tracks) => jsonEncode(tracks.map((t) => t.toJsonCache()).toList()),
    deserialize: (json) => (jsonDecode(json) as List)
        .map((e) => MadhaWithRelations.fromJson(e as Map<String, dynamic>))
        .toList(),
  );
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
  return _cache.fetch<List<MadhaWithRelations>>(
    key: 'collection_tracks:$collectionId',
    maxAge: const Duration(hours: 12),
    fetcher: () async {
      final dynamic result = await supabase.rpc('get_collection_tracks', params: {
        'p_collection_id': collectionId,
      });
      return _asList(result).map((e) => MadhaWithRelations.fromJson(e)).toList();
    },
    serialize: (tracks) => jsonEncode(tracks.map((t) => t.toJsonCache()).toList()),
    deserialize: (json) => (jsonDecode(json) as List)
        .map((e) => MadhaWithRelations.fromJson(e as Map<String, dynamic>))
        .toList(),
  );
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
