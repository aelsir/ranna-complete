import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';

import '../db/local_db.dart';
import '../models/madha.dart';
import '../utils/format.dart';

/// Manages downloading audio files from R2 for offline playback.
class DownloadService {
  static final DownloadService _instance = DownloadService._();
  factory DownloadService() => _instance;
  DownloadService._();

  final Dio _dio = Dio(BaseOptions(
    connectTimeout: const Duration(seconds: 30),
    receiveTimeout: const Duration(minutes: 10),
  ));

  /// Active cancel tokens keyed by trackId.
  final Map<String, CancelToken> _cancelTokens = {};

  /// Download a track's audio file to local storage.
  ///
  /// Returns the local file path on success.
  /// [onProgress] emits values from 0.0 to 1.0.
  Future<String> downloadTrack({
    required MadhaWithRelations track,
    void Function(double progress)? onProgress,
  }) async {
    final audioUrl = getAudioUrl(track.audioUrl);
    if (audioUrl.isEmpty) {
      throw Exception('Track has no audio URL');
    }

    final dir = await getApplicationDocumentsDirectory();
    final tracksDir = Directory('${dir.path}/tracks');
    if (!await tracksDir.exists()) {
      await tracksDir.create(recursive: true);
    }

    // Determine file extension from URL
    final urlPath = Uri.parse(audioUrl).path;
    final ext = urlPath.contains('.') ? urlPath.split('.').last : 'mp3';
    final localPath = '${tracksDir.path}/${track.id}.$ext';

    // Create cancel token for this download
    final cancelToken = CancelToken();
    _cancelTokens[track.id] = cancelToken;

    try {
      await _dio.download(
        audioUrl,
        localPath,
        cancelToken: cancelToken,
        onReceiveProgress: (received, total) {
          if (total > 0 && onProgress != null) {
            onProgress(received / total);
          }
        },
      );

      // Get actual file size
      final file = File(localPath);
      final fileSize = await file.length();

      // Serialize track metadata for offline display
      final metadataJson = jsonEncode({
        'id': track.id,
        'title': track.title,
        'madih': track.madih,
        'writer': track.writer,
        'audio_url': track.audioUrl,
        'image_url': track.imageUrl,
        'madih_id': track.madihId,
        'rawi_id': track.rawiId,
        'duration_seconds': track.durationSeconds,
        'lyrics': track.lyrics,
        'play_count': track.playCount,
        // Nested artist/narrator data for offline display
        if (track.madihDetails != null) 'madiheen': {
          'id': track.madihDetails!.id,
          'name': track.madihDetails!.name,
          'image_url': track.madihDetails!.imageUrl,
        },
        if (track.rawi != null) 'ruwat': {
          'id': track.rawi!.id,
          'name': track.rawi!.name,
          'image_url': track.rawi!.imageUrl,
        },
      });

      // Save to SQLite
      await LocalDb.saveDownload(track.id, localPath, metadataJson, fileSize);

      debugPrint('✅ Downloaded: ${track.title} (${_formatBytes(fileSize)})');
      return localPath;
    } on DioException catch (e) {
      // Clean up partial file on failure
      final file = File(localPath);
      if (await file.exists()) await file.delete();

      if (e.type == DioExceptionType.cancel) {
        debugPrint('⏹️ Download cancelled: ${track.title}');
        rethrow;
      }
      debugPrint('⛔ Download failed: ${track.title} — ${e.message}');
      rethrow;
    } finally {
      _cancelTokens.remove(track.id);
    }
  }

  /// Cancel an in-progress download.
  void cancelDownload(String trackId) {
    _cancelTokens[trackId]?.cancel('User cancelled');
    _cancelTokens.remove(trackId);
  }

  /// Delete a downloaded track's file and database record.
  Future<void> deleteDownload(String trackId) async {
    final localPath = await LocalDb.getLocalPath(trackId);
    if (localPath != null) {
      final file = File(localPath);
      if (await file.exists()) {
        await file.delete();
        debugPrint('🗑️ Deleted download: $localPath');
      }
    }
    await LocalDb.deleteDownload(trackId);
  }

  /// Delete all downloaded tracks.
  Future<void> deleteAllDownloads() async {
    final downloads = await LocalDb.getAllDownloads();
    for (final d in downloads) {
      final file = File(d.localPath);
      if (await file.exists()) await file.delete();
    }
    await LocalDb.deleteAllDownloads();
    debugPrint('🗑️ Deleted all downloads (${downloads.length} tracks)');
  }

  String _formatBytes(int bytes) {
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(0)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
}
