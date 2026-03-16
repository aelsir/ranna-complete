class Tariqa {
  final String id;
  final String name;
  final String? description;
  final String createdAt;

  const Tariqa({
    required this.id,
    required this.name,
    this.description,
    required this.createdAt,
  });

  factory Tariqa.fromJson(Map<String, dynamic> json) {
    return Tariqa(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      createdAt: json['created_at'] as String,
    );
  }
}
