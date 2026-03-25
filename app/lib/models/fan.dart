class Fan {
  final String id;
  final String name;
  final String? description;
  final String createdAt;

  const Fan({
    required this.id,
    required this.name,
    this.description,
    required this.createdAt,
  });

  factory Fan.fromJson(Map<String, dynamic> json) {
    return Fan(
      id: json['id'] as String,
      name: json['name'] as String? ?? '',
      description: json['description'] as String?,
      createdAt: json['created_at'] as String? ?? '',
    );
  }
}
