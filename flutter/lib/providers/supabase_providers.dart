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

// ============================================
// Home page data
// ============================================

final homeDataProvider = FutureProvider<HomeData>((ref) async {
  final supabase = ref.read(supabaseProvider);

  final results = await Future.wait([
    // Featured tracks
    supabase
        .from('madha')
        .select('*, madiheen:madih_id(*), ruwat:rawi_id(*), turuq:tariqa_id(*), funun:fan_id(*)')
        .eq('status', 'approved')
        .eq('is_featured', true)
        .order('created_at', ascending: false)
        .limit(10),
    // Popular tracks
    supabase
        .from('madha')
        .select('*, madiheen:madih_id(*), ruwat:rawi_id(*), turuq:tariqa_id(*), funun:fan_id(*)')
        .eq('status', 'approved')
        .order('play_count', ascending: false)
        .limit(10),
    // Recent tracks
    supabase
        .from('madha')
        .select('*, madiheen:madih_id(*), ruwat:rawi_id(*), turuq:tariqa_id(*), funun:fan_id(*)')
        .eq('status', 'approved')
        .order('created_at', ascending: false)
        .limit(10),
    // Artists
    supabase
        .from('madiheen')
        .select()
        .eq('status', 'approved')
        .order('name')
        .limit(20),
    // Collections
    supabase
        .from('collections')
        .select()
        .eq('is_active', true)
        .order('display_order'),
  ]);

  return HomeData(
    featuredTracks: (results[0] as List).map((e) => MadhaWithRelations.fromJson(e)).toList(),
    popularTracks: (results[1] as List).map((e) => MadhaWithRelations.fromJson(e)).toList(),
    recentTracks: (results[2] as List).map((e) => MadhaWithRelations.fromJson(e)).toList(),
    artists: (results[3] as List).map((e) => Madih.fromJson(e)).toList(),
    collections: (results[4] as List).map((e) => MusicCollection.fromJson(e)).toList(),
  );
});

class HomeData {
  final List<MadhaWithRelations> featuredTracks;
  final List<MadhaWithRelations> popularTracks;
  final List<MadhaWithRelations> recentTracks;
  final List<Madih> artists;
  final List<MusicCollection> collections;

  const HomeData({
    required this.featuredTracks,
    required this.popularTracks,
    required this.recentTracks,
    required this.artists,
    required this.collections,
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
  final results = await supabase
      .from('madha')
      .select('*, madiheen:madih_id(*), ruwat:rawi_id(*), turuq:tariqa_id(*), funun:fan_id(*)')
      .eq('status', 'approved')
      .or('title.ilike.%$query%,madih.ilike.%$query%')
      .order('play_count', ascending: false)
      .limit(50);

  return (results as List).map((e) => MadhaWithRelations.fromJson(e)).toList();
});

// ============================================
// Artists (Madiheen)
// ============================================

final allArtistsProvider = FutureProvider<List<Madih>>((ref) async {
  final supabase = ref.read(supabaseProvider);
  final results = await supabase
      .from('madiheen')
      .select()
      .eq('status', 'approved')
      .order('name');
  return (results as List).map((e) => Madih.fromJson(e)).toList();
});

final artistTracksProvider =
    FutureProvider.family<List<MadhaWithRelations>, String>((ref, artistId) async {
  final supabase = ref.read(supabaseProvider);
  final results = await supabase
      .from('madha')
      .select('*, madiheen:madih_id(*), ruwat:rawi_id(*), turuq:tariqa_id(*), funun:fan_id(*)')
      .eq('status', 'approved')
      .eq('madih_id', artistId)
      .order('created_at', ascending: false);
  return (results as List).map((e) => MadhaWithRelations.fromJson(e)).toList();
});

final artistDetailProvider = FutureProvider.family<Madih?, String>((ref, id) async {
  final supabase = ref.read(supabaseProvider);
  final result = await supabase.from('madiheen').select().eq('id', id).maybeSingle();
  if (result == null) return null;
  return Madih.fromJson(result);
});

// ============================================
// Narrators (Ruwat)
// ============================================

final allNarratorsProvider = FutureProvider<List<Rawi>>((ref) async {
  final supabase = ref.read(supabaseProvider);
  final results = await supabase
      .from('ruwat')
      .select()
      .eq('status', 'approved')
      .order('name');
  return (results as List).map((e) => Rawi.fromJson(e)).toList();
});

final narratorTracksProvider =
    FutureProvider.family<List<MadhaWithRelations>, String>((ref, rawiId) async {
  final supabase = ref.read(supabaseProvider);
  final results = await supabase
      .from('madha')
      .select('*, madiheen:madih_id(*), ruwat:rawi_id(*), turuq:tariqa_id(*), funun:fan_id(*)')
      .eq('status', 'approved')
      .eq('rawi_id', rawiId)
      .order('created_at', ascending: false);
  return (results as List).map((e) => MadhaWithRelations.fromJson(e)).toList();
});

final narratorDetailProvider = FutureProvider.family<Rawi?, String>((ref, id) async {
  final supabase = ref.read(supabaseProvider);
  final result = await supabase.from('ruwat').select().eq('id', id).maybeSingle();
  if (result == null) return null;
  return Rawi.fromJson(result);
});

// ============================================
// Sufi Orders (Turuq)
// ============================================

final allTuruqProvider = FutureProvider<List<Tariqa>>((ref) async {
  final supabase = ref.read(supabaseProvider);
  final results = await supabase.from('turuq').select().order('name');
  return (results as List).map((e) => Tariqa.fromJson(e)).toList();
});

// ============================================
// Music Styles (Funun)
// ============================================

final allFununProvider = FutureProvider<List<Fan>>((ref) async {
  final supabase = ref.read(supabaseProvider);
  final results = await supabase.from('funun').select().order('name');
  return (results as List).map((e) => Fan.fromJson(e)).toList();
});

// ============================================
// Collections
// ============================================

final allCollectionsProvider = FutureProvider<List<MusicCollection>>((ref) async {
  final supabase = ref.read(supabaseProvider);
  final results = await supabase
      .from('collections')
      .select()
      .eq('is_active', true)
      .order('display_order');
  return (results as List).map((e) => MusicCollection.fromJson(e)).toList();
});

final collectionTracksProvider =
    FutureProvider.family<List<MadhaWithRelations>, String>((ref, collectionId) async {
  final supabase = ref.read(supabaseProvider);
  final items = await supabase
      .from('collection_items')
      .select('madha_id, position, madha:madha_id(*, madiheen:madih_id(*), ruwat:rawi_id(*), turuq:tariqa_id(*), funun:fan_id(*))')
      .eq('collection_id', collectionId)
      .order('position');

  return (items as List)
      .where((e) => e['madha'] != null)
      .map((e) => MadhaWithRelations.fromJson(e['madha']))
      .toList();
});

final collectionDetailProvider =
    FutureProvider.family<MusicCollection?, String>((ref, id) async {
  final supabase = ref.read(supabaseProvider);
  final result = await supabase.from('collections').select().eq('id', id).maybeSingle();
  if (result == null) return null;
  return MusicCollection.fromJson(result);
});

// ============================================
// Tracks by filter
// ============================================

final tracksByTariqaProvider =
    FutureProvider.family<List<MadhaWithRelations>, String>((ref, tariqaId) async {
  final supabase = ref.read(supabaseProvider);
  final results = await supabase
      .from('madha')
      .select('*, madiheen:madih_id(*), ruwat:rawi_id(*), turuq:tariqa_id(*), funun:fan_id(*)')
      .eq('status', 'approved')
      .eq('tariqa_id', tariqaId)
      .order('created_at', ascending: false);
  return (results as List).map((e) => MadhaWithRelations.fromJson(e)).toList();
});

final tracksByFanProvider =
    FutureProvider.family<List<MadhaWithRelations>, String>((ref, fanId) async {
  final supabase = ref.read(supabaseProvider);
  final results = await supabase
      .from('madha')
      .select('*, madiheen:madih_id(*), ruwat:rawi_id(*), turuq:tariqa_id(*), funun:fan_id(*)')
      .eq('status', 'approved')
      .eq('fan_id', fanId)
      .order('created_at', ascending: false);
  return (results as List).map((e) => MadhaWithRelations.fromJson(e)).toList();
});
