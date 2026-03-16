class Rawi {
  final String id;
  final String name;
  final String status;
  final String? bio;
  final String? imageUrl;
  final int? birthYear;
  final int? deathYear;
  final String createdAt;

  const Rawi({
    required this.id,
    required this.name,
    required this.status,
    this.bio,
    this.imageUrl,
    this.birthYear,
    this.deathYear,
    required this.createdAt,
  });

  factory Rawi.fromJson(Map<String, dynamic> json) {
    return Rawi(
      id: json['id'] as String,
      name: json['name'] as String,
      status: json['status'] as String,
      bio: json['bio'] as String?,
      imageUrl: json['image_url'] as String?,
      birthYear: json['birth_year'] as int?,
      deathYear: json['death_year'] as int?,
      createdAt: json['created_at'] as String,
    );
  }
}
