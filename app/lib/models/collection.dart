class MusicCollection {
  final String id;
  final String name;
  final String? nameEn;
  final String? description;
  final String? imageUrl;
  final bool isActive;
  final int displayOrder;
  final String createdAt;

  const MusicCollection({
    required this.id,
    required this.name,
    this.nameEn,
    this.description,
    this.imageUrl,
    required this.isActive,
    required this.displayOrder,
    required this.createdAt,
  });

  factory MusicCollection.fromJson(Map<String, dynamic> json) {
    return MusicCollection(
      id: json['id'] as String,
      name: json['name'] as String? ?? '',
      nameEn: json['name_en'] as String?,
      description: json['description'] as String?,
      imageUrl: json['image_url'] as String?,
      isActive: json['is_active'] as bool? ?? true,
      displayOrder: json['display_order'] as int? ?? 0,
      createdAt: json['created_at'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJsonCache() => {
        'id': id, 'name': name, 'name_en': nameEn, 'description': description,
        'image_url': imageUrl, 'is_active': isActive,
        'display_order': displayOrder, 'created_at': createdAt,
      };
}
