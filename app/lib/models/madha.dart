import 'package:ranna/models/fan.dart';
import 'package:ranna/models/madih.dart';
import 'package:ranna/models/rawi.dart';
import 'package:ranna/models/tariqa.dart';

class Madha {
  final String id;
  final String title;
  final String madih;
  final String? writer;
  final String? madihId;
  final String? rawiId;
  final String? audioUrl;
  final String? imageUrl;
  final String? userId;
  final String status;
  final bool needsProcessing;
  final String? tariqaId;
  final String? fanId;
  final int playCount;
  final String? lyrics;
  final int? durationSeconds;
  final bool isFeatured;
  final String createdAt;
  final String updatedAt;
  final int? fileSizeBytes;
  final String? thumbnailUrl;
  final String? contentType;

  const Madha({
    required this.id,
    required this.title,
    required this.madih,
    this.writer,
    this.madihId,
    this.rawiId,
    this.audioUrl,
    this.imageUrl,
    this.userId,
    required this.status,
    required this.needsProcessing,
    this.tariqaId,
    this.fanId,
    required this.playCount,
    this.lyrics,
    this.durationSeconds,
    required this.isFeatured,
    required this.createdAt,
    required this.updatedAt,
    this.fileSizeBytes,
    this.thumbnailUrl,
    this.contentType,
  });

  factory Madha.fromJson(Map<String, dynamic> json) {
    return Madha(
      id: json['id'] as String,
      title: json['title'] as String? ?? '',
      madih: json['madih'] as String? ?? '',
      writer: json['writer'] as String?,
      madihId: json['madih_id'] as String?,
      rawiId: json['rawi_id'] as String?,
      audioUrl: json['audio_url'] as String?,
      imageUrl: json['image_url'] as String?,
      userId: json['user_id'] as String?,
      status: json['status'] as String? ?? 'pending',
      needsProcessing: json['needs_processing'] as bool? ?? true,
      tariqaId: json['tariqa_id'] as String?,
      fanId: json['fan_id'] as String?,
      playCount: json['play_count'] as int? ?? 0,
      lyrics: json['lyrics'] as String?,
      durationSeconds: json['duration_seconds'] as int?,
      isFeatured: json['is_featured'] as bool? ?? false,
      createdAt: json['created_at'] as String? ?? '',
      updatedAt: json['updated_at'] as String? ?? '',
      fileSizeBytes: json['file_size_bytes'] as int?,
      thumbnailUrl: json['thumbnail_url'] as String?,
      contentType: json['content_type'] as String?,
    );
  }
}

class MadhaWithRelations extends Madha {
  final Madih? madihDetails;
  final Rawi? rawi;
  final Tariqa? tariqa;
  final Fan? fan;

  const MadhaWithRelations({
    required super.id,
    required super.title,
    required super.madih,
    super.writer,
    super.madihId,
    super.rawiId,
    super.audioUrl,
    super.imageUrl,
    super.userId,
    required super.status,
    required super.needsProcessing,
    super.tariqaId,
    super.fanId,
    required super.playCount,
    super.lyrics,
    super.durationSeconds,
    required super.isFeatured,
    required super.createdAt,
    required super.updatedAt,
    super.fileSizeBytes,
    super.thumbnailUrl,
    super.contentType,
    this.madihDetails,
    this.rawi,
    this.tariqa,
    this.fan,
  });

  /// Resolved image URL following the fallback chain:
  /// track image → madih image → rawi image → null
  /// UI should show the Ranna logo when this returns null.
  String? get resolvedImageUrl =>
      _nonEmpty(imageUrl) ??
      _nonEmpty(madihDetails?.imageUrl) ??
      _nonEmpty(rawi?.imageUrl);

  static String? _nonEmpty(String? s) =>
      (s != null && s.isNotEmpty) ? s : null;

  factory MadhaWithRelations.fromJson(Map<String, dynamic> json) {
    return MadhaWithRelations(
      id: json['id'] as String,
      title: json['title'] as String? ?? '',
      madih: json['madih'] as String? ?? '',
      writer: json['writer'] as String?,
      madihId: json['madih_id'] as String?,
      rawiId: json['rawi_id'] as String?,
      audioUrl: json['audio_url'] as String?,
      imageUrl: json['image_url'] as String?,
      userId: json['user_id'] as String?,
      status: json['status'] as String? ?? 'pending',
      needsProcessing: json['needs_processing'] as bool? ?? true,
      tariqaId: json['tariqa_id'] as String?,
      fanId: json['fan_id'] as String?,
      playCount: json['play_count'] as int? ?? 0,
      lyrics: json['lyrics'] as String?,
      durationSeconds: json['duration_seconds'] as int?,
      isFeatured: json['is_featured'] as bool? ?? false,
      createdAt: json['created_at'] as String? ?? '',
      updatedAt: json['updated_at'] as String? ?? '',
      fileSizeBytes: json['file_size_bytes'] as int?,
      thumbnailUrl: json['thumbnail_url'] as String?,
      contentType: json['content_type'] as String?,
      madihDetails: json['madiheen'] != null
          ? Madih.fromJson(json['madiheen'] as Map<String, dynamic>)
          : null,
      rawi: json['ruwat'] != null
          ? Rawi.fromJson(json['ruwat'] as Map<String, dynamic>)
          : null,
      tariqa: json['turuq'] != null
          ? Tariqa.fromJson(json['turuq'] as Map<String, dynamic>)
          : null,
      fan: json['funun'] != null
          ? Fan.fromJson(json['funun'] as Map<String, dynamic>)
          : null,
    );
  }

  /// Serialize to JSON for local caching.
  Map<String, dynamic> toJsonCache() => {
        'id': id, 'title': title, 'madih': madih, 'writer': writer,
        'madih_id': madihId, 'rawi_id': rawiId,
        'audio_url': audioUrl, 'image_url': imageUrl,
        'user_id': userId, 'status': status,
        'needs_processing': needsProcessing,
        'tariqa_id': tariqaId, 'fan_id': fanId,
        'play_count': playCount, 'lyrics': lyrics,
        'duration_seconds': durationSeconds, 'is_featured': isFeatured,
        'created_at': createdAt, 'updated_at': updatedAt,
        'file_size_bytes': fileSizeBytes,
        'thumbnail_url': thumbnailUrl, 'content_type': contentType,
        if (madihDetails != null) 'madiheen': madihDetails!.toJsonCache(),
        if (rawi != null) 'ruwat': rawi!.toJsonCache(),
        if (tariqa != null) 'turuq': tariqa!.toJsonCache(),
        if (fan != null) 'funun': fan!.toJsonCache(),
      };
}
