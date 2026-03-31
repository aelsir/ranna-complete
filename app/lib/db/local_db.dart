import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart' as p;

/// Lightweight row from the downloaded_tracks table.
class DownloadedTrackRow {
  final String trackId;
  final String localPath;
  final String metadataJson;
  final int fileSizeBytes;
  final String downloadedAt;

  const DownloadedTrackRow({
    required this.trackId,
    required this.localPath,
    required this.metadataJson,
    required this.fileSizeBytes,
    required this.downloadedAt,
  });

  factory DownloadedTrackRow.fromMap(Map<String, dynamic> map) {
    return DownloadedTrackRow(
      trackId: map['track_id'] as String,
      localPath: map['local_path'] as String,
      metadataJson: map['metadata_json'] as String,
      fileSizeBytes: map['file_size_bytes'] as int,
      downloadedAt: map['downloaded_at'] as String,
    );
  }

  /// Parse the stored metadata JSON back into a Map.
  Map<String, dynamic> get metadata =>
      jsonDecode(metadataJson) as Map<String, dynamic>;
}

/// Row from the pending_actions table.
class PendingActionRow {
  final int id;
  final String actionType;
  final String payload;
  final String createdAt;

  const PendingActionRow({
    required this.id,
    required this.actionType,
    required this.payload,
    required this.createdAt,
  });

  factory PendingActionRow.fromMap(Map<String, dynamic> map) {
    return PendingActionRow(
      id: map['id'] as int,
      actionType: map['action_type'] as String,
      payload: map['payload'] as String,
      createdAt: map['created_at'] as String,
    );
  }

  Map<String, dynamic> get payloadMap =>
      jsonDecode(payload) as Map<String, dynamic>;
}

/// Local SQLite database for offline features.
///
/// Two tables:
/// - `downloaded_tracks` — metadata for tracks saved to device storage
/// - `pending_actions` — queued actions to sync when back online
class LocalDb {
  static Database? _db;

  /// Open or create the database. Call once in main().
  static Future<void> init() async {
    if (_db != null) return;
    // sqflite not supported on web
    if (kIsWeb) return;
    final dbPath = await getDatabasesPath();
    _db = await openDatabase(
      p.join(dbPath, 'ranna.db'),
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE downloaded_tracks (
            track_id TEXT PRIMARY KEY,
            local_path TEXT NOT NULL,
            metadata_json TEXT NOT NULL,
            file_size_bytes INTEGER NOT NULL DEFAULT 0,
            downloaded_at TEXT NOT NULL
          )
        ''');
        await db.execute('''
          CREATE TABLE pending_actions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action_type TEXT NOT NULL,
            payload TEXT NOT NULL,
            created_at TEXT NOT NULL
          )
        ''');
      },
    );
  }

  // ── Downloaded Tracks ─────────────────────────────────────

  /// Save a completed download.
  static Future<void> saveDownload(
    String trackId,
    String localPath,
    String metadataJson,
    int sizeBytes,
  ) async {
    final db = _db;
    if (db == null) return;
    await db.insert(
      'downloaded_tracks',
      {
        'track_id': trackId,
        'local_path': localPath,
        'metadata_json': metadataJson,
        'file_size_bytes': sizeBytes,
        'downloaded_at': DateTime.now().toIso8601String(),
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  /// Get the local file path for a track, or null if not downloaded.
  static Future<String?> getLocalPath(String trackId) async {
    final db = _db;
    if (db == null) return null;
    final rows = await db.query(
      'downloaded_tracks',
      columns: ['local_path'],
      where: 'track_id = ?',
      whereArgs: [trackId],
      limit: 1,
    );
    if (rows.isEmpty) return null;
    return rows.first['local_path'] as String;
  }

  /// Get all downloaded track rows, newest first.
  static Future<List<DownloadedTrackRow>> getAllDownloads() async {
    final db = _db;
    if (db == null) return [];
    final rows = await db.query(
      'downloaded_tracks',
      orderBy: 'downloaded_at DESC',
    );
    return rows.map((r) => DownloadedTrackRow.fromMap(r)).toList();
  }

  /// Get all downloaded track IDs (fast — no metadata).
  static Future<Set<String>> getAllDownloadedIds() async {
    final db = _db;
    if (db == null) return {};
    final rows = await db.query(
      'downloaded_tracks',
      columns: ['track_id'],
    );
    return rows.map((r) => r['track_id'] as String).toSet();
  }

  /// Remove a download record (caller must also delete the file).
  static Future<void> deleteDownload(String trackId) async {
    final db = _db;
    if (db == null) return;
    await db.delete(
      'downloaded_tracks',
      where: 'track_id = ?',
      whereArgs: [trackId],
    );
  }

  /// Total bytes stored in downloaded tracks.
  static Future<int> getTotalStorageUsed() async {
    final db = _db;
    if (db == null) return 0;
    final result = await db.rawQuery(
      'SELECT COALESCE(SUM(file_size_bytes), 0) AS total FROM downloaded_tracks',
    );
    return (result.first['total'] as int?) ?? 0;
  }

  /// Check if a specific track is downloaded.
  static Future<bool> isDownloaded(String trackId) async {
    final db = _db;
    if (db == null) return false;
    final rows = await db.query(
      'downloaded_tracks',
      columns: ['track_id'],
      where: 'track_id = ?',
      whereArgs: [trackId],
      limit: 1,
    );
    return rows.isNotEmpty;
  }

  /// Delete all download records.
  static Future<void> deleteAllDownloads() async {
    final db = _db;
    if (db == null) return;
    await db.delete('downloaded_tracks');
  }

  // ── Pending Actions Queue ────────────────────────────────

  /// Enqueue an action to be synced when back online.
  static Future<void> enqueueAction(
    String type,
    Map<String, dynamic> payload,
  ) async {
    final db = _db;
    if (db == null) return;
    await db.insert('pending_actions', {
      'action_type': type,
      'payload': jsonEncode(payload),
      'created_at': DateTime.now().toIso8601String(),
    });
  }

  /// Get all pending (unsynced) actions.
  static Future<List<PendingActionRow>> getPendingActions() async {
    final db = _db;
    if (db == null) return [];
    final rows = await db.query(
      'pending_actions',
      orderBy: 'created_at ASC',
    );
    return rows.map((r) => PendingActionRow.fromMap(r)).toList();
  }

  /// Delete a pending action after successful sync.
  static Future<void> deletePendingAction(int id) async {
    final db = _db;
    if (db == null) return;
    await db.delete(
      'pending_actions',
      where: 'id = ?',
      whereArgs: [id],
    );
  }
}
