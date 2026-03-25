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
    this.madihDetails,
    this.rawi,
    this.tariqa,
    this.fan,
  });

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
}
