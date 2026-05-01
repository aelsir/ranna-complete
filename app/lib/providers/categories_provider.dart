/// Sufi orders (طرق) and music styles (فنون), plus the "tracks filtered by
/// طريقة or فن" providers that the browse screens use to drill in. These
/// are categorical reference data — small lists, change rarely.
library;

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:ranna/models/fan.dart';
import 'package:ranna/models/madha.dart';
import 'package:ranna/models/tariqa.dart';

import 'supabase_internals.dart';

// ============================================================================
// Sufi Orders (Turuq)
// ============================================================================

/// All Sufi orders, alphabetised. Reference data — every approved track
/// should belong to one of these.
final allTuruqProvider = FutureProvider<List<Tariqa>>((ref) async {
  final supabase = ref.read(supabaseProvider);
  try {
    final dynamic results =
        await supabase.from('turuq').select().order('name');
    return asList(results).map((e) => Tariqa.fromJson(e)).toList();
  } catch (e) {
    debugPrint('⛔ allTuruqProvider error: $e');
    return [];
  }
});

// ============================================================================
// Music Styles (Funun)
// ============================================================================

/// All taar tones / styles, alphabetised. Same shape as turuq —
/// reference data attached to tracks.
final allFununProvider = FutureProvider<List<Fan>>((ref) async {
  final supabase = ref.read(supabaseProvider);
  try {
    final dynamic results =
        await supabase.from('funun').select().order('name');
    return asList(results).map((e) => Fan.fromJson(e)).toList();
  } catch (e) {
    debugPrint('⛔ allFununProvider error: $e');
    return [];
  }
});

// ============================================================================
// Tracks filtered by category — used by the "browse by طريقة / فن" pages
// ============================================================================

/// Approved tracks belonging to a specific طريقة, newest first.
final tracksByTariqaProvider =
    FutureProvider.family<List<MadhaWithRelations>, String>((ref, tariqaId) async {
  final supabase = ref.read(supabaseProvider);
  try {
    final dynamic results = await supabase
        .from('v_tracks')
        .select()
        .eq('tariqa_id', tariqaId)
        .order('created_at', ascending: false);
    return asList(results)
        .map((e) => MadhaWithRelations.fromJson(e))
        .toList();
  } catch (e) {
    debugPrint('⛔ tracksByTariqaProvider error: $e');
    return [];
  }
});

/// Approved tracks belonging to a specific فن, newest first.
final tracksByFanProvider =
    FutureProvider.family<List<MadhaWithRelations>, String>((ref, fanId) async {
  final supabase = ref.read(supabaseProvider);
  try {
    final dynamic results = await supabase
        .from('v_tracks')
        .select()
        .eq('fan_id', fanId)
        .order('created_at', ascending: false);
    return asList(results)
        .map((e) => MadhaWithRelations.fromJson(e))
        .toList();
  } catch (e) {
    debugPrint('⛔ tracksByFanProvider error: $e');
    return [];
  }
});
