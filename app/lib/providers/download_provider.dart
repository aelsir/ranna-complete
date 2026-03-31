import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../db/local_db.dart';
import '../models/madha.dart';
import '../services/download_service.dart';

// ============================================
// Downloaded Track IDs (reactive set)
// ============================================

class DownloadedTrackIdsNotifier extends StateNotifier<Set<String>> {
  DownloadedTrackIdsNotifier() : super({}) {
    _load();
  }

  Future<void> _load() async {
    state = await LocalDb.getAllDownloadedIds();
  }

  bool isDownloaded(String trackId) => state.contains(trackId);

  void markDownloaded(String trackId) {
    state = {...state, trackId};
  }

  void markRemoved(String trackId) {
    state = {...state}..remove(trackId);
  }

  Future<void> reload() async {
    state = await LocalDb.getAllDownloadedIds();
  }
}

final downloadedTrackIdsProvider =
    StateNotifierProvider<DownloadedTrackIdsNotifier, Set<String>>(
  (ref) => DownloadedTrackIdsNotifier(),
);

// ============================================
// Active Downloads (progress tracking)
// ============================================

class ActiveDownloadsNotifier extends StateNotifier<Map<String, double>> {
  ActiveDownloadsNotifier() : super({});

  void updateProgress(String trackId, double progress) {
    state = {...state, trackId: progress};
  }

  void remove(String trackId) {
    state = {...state}..remove(trackId);
  }

  bool isDownloading(String trackId) => state.containsKey(trackId);
}

final activeDownloadsProvider =
    StateNotifierProvider<ActiveDownloadsNotifier, Map<String, double>>(
  (ref) => ActiveDownloadsNotifier(),
);

// ============================================
// Download Service Provider
// ============================================

final downloadServiceProvider = Provider<DownloadService>(
  (ref) => DownloadService(),
);

// ============================================
// All Downloaded Tracks (full metadata)
// ============================================

final downloadedTracksProvider =
    FutureProvider<List<DownloadedTrackRow>>((ref) async {
  // Re-fetch whenever the downloaded IDs set changes
  ref.watch(downloadedTrackIdsProvider);
  return LocalDb.getAllDownloads();
});

// ============================================
// Total Storage Used
// ============================================

final downloadStorageProvider = FutureProvider<int>((ref) async {
  ref.watch(downloadedTrackIdsProvider);
  return LocalDb.getTotalStorageUsed();
});

// ============================================
// Helper: Start a download
// ============================================

/// Start downloading a track. Updates providers automatically.
Future<void> startDownload(WidgetRef ref, MadhaWithRelations track) async {
  final service = ref.read(downloadServiceProvider);
  final activeNotifier = ref.read(activeDownloadsProvider.notifier);
  final idsNotifier = ref.read(downloadedTrackIdsProvider.notifier);

  // Already downloading?
  if (ref.read(activeDownloadsProvider).containsKey(track.id)) return;
  // Already downloaded?
  if (ref.read(downloadedTrackIdsProvider).contains(track.id)) return;

  try {
    activeNotifier.updateProgress(track.id, 0.0);

    await service.downloadTrack(
      track: track,
      onProgress: (progress) {
        activeNotifier.updateProgress(track.id, progress);
      },
    );

    // Success
    activeNotifier.remove(track.id);
    idsNotifier.markDownloaded(track.id);
    // Invalidate the full list + storage providers
    ref.invalidate(downloadedTracksProvider);
    ref.invalidate(downloadStorageProvider);
  } catch (e) {
    activeNotifier.remove(track.id);
    debugPrint('⛔ startDownload error: $e');
    rethrow;
  }
}

/// Delete a single download.
Future<void> removeDownload(WidgetRef ref, String trackId) async {
  final service = ref.read(downloadServiceProvider);
  final idsNotifier = ref.read(downloadedTrackIdsProvider.notifier);

  await service.deleteDownload(trackId);
  idsNotifier.markRemoved(trackId);
  ref.invalidate(downloadedTracksProvider);
  ref.invalidate(downloadStorageProvider);
}

/// Delete all downloads.
Future<void> removeAllDownloads(WidgetRef ref) async {
  final service = ref.read(downloadServiceProvider);
  final idsNotifier = ref.read(downloadedTrackIdsProvider.notifier);

  await service.deleteAllDownloads();
  await idsNotifier.reload();
  ref.invalidate(downloadedTracksProvider);
  ref.invalidate(downloadStorageProvider);
}
