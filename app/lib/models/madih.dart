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
    );
  }
}
