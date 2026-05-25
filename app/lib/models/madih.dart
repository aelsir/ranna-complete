class Madih {
  final String id;
  final String name;
  final String status;
  final String? bio;
  final String? imageUrl;
  final int? birthYear;
  final int? deathYear;
  final bool isVerified;
  final String? tariqaId;
  final String createdAt;
  final int trackCount;
  /// Total plays across this artist's tracks in the last 30 days.
  /// Comes from v_artists.recent_play_count (migration 049).
  final int recentPlayCount;
  /// Subset of [recentPlayCount] where the play completed. Primary
  /// sort key for the all-artists list when sorting by popularity.
  final int recentCompletedPlays;

  const Madih({
    required this.id,
    required this.name,
    required this.status,
    this.bio,
    this.imageUrl,
    this.birthYear,
    this.deathYear,
    required this.isVerified,
    this.tariqaId,
    required this.createdAt,
    this.trackCount = 0,
    this.recentPlayCount = 0,
    this.recentCompletedPlays = 0,
  });

  factory Madih.fromJson(Map<String, dynamic> json) {
    return Madih(
      id: json['id'] as String,
      name: json['name'] as String? ?? '',
      status: json['status'] as String? ?? 'pending',
      bio: json['bio'] as String?,
      imageUrl: json['image_url'] as String?,
      birthYear: json['birth_year'] as int?,
      deathYear: json['death_year'] as int?,
      isVerified: json['is_verified'] as bool? ?? false,
      tariqaId: json['tariqa_id'] as String?,
      createdAt: json['created_at'] as String? ?? '',
      trackCount: json['track_count'] as int? ?? 0,
      recentPlayCount: json['recent_play_count'] as int? ?? 0,
      recentCompletedPlays: json['recent_completed_plays'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJsonCache() => {
        'id': id, 'name': name, 'status': status, 'bio': bio,
        'image_url': imageUrl, 'birth_year': birthYear, 'death_year': deathYear,
        'is_verified': isVerified, 'tariqa_id': tariqaId,
        'created_at': createdAt, 'track_count': trackCount,
        'recent_play_count': recentPlayCount,
        'recent_completed_plays': recentCompletedPlays,
      };
}
