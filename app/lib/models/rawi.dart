class Rawi {
  final String id;
  final String name;
  final String status;
  final String? bio;
  final String? imageUrl;
  final int? birthYear;
  final int? deathYear;
  final String createdAt;
  final int trackCount;

  const Rawi({
    required this.id,
    required this.name,
    required this.status,
    this.bio,
    this.imageUrl,
    this.birthYear,
    this.deathYear,
    required this.createdAt,
    this.trackCount = 0,
  });

  factory Rawi.fromJson(Map<String, dynamic> json) {
    return Rawi(
      id: json['id'] as String,
      name: json['name'] as String? ?? '',
      status: json['status'] as String? ?? 'pending',
      bio: json['bio'] as String?,
      imageUrl: json['image_url'] as String?,
      birthYear: json['birth_year'] as int?,
      deathYear: json['death_year'] as int?,
      createdAt: json['created_at'] as String? ?? '',
      trackCount: json['track_count'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJsonCache() => {
        'id': id, 'name': name, 'status': status, 'bio': bio,
        'image_url': imageUrl, 'birth_year': birthYear, 'death_year': deathYear,
        'created_at': createdAt, 'track_count': trackCount,
      };
}
