/// Landing-page hero banner managed by admins. The list of active heroes
/// drives the `_HeroBanner` widget on the home screen.
class HeroImage {
  final String id;
  final String imageUrl;
  final String? title;
  final String? linkUrl;
  final bool isActive;
  final int displayOrder;
  final String createdAt;

  const HeroImage({
    required this.id,
    required this.imageUrl,
    this.title,
    this.linkUrl,
    required this.isActive,
    required this.displayOrder,
    required this.createdAt,
  });

  factory HeroImage.fromJson(Map<String, dynamic> json) {
    return HeroImage(
      id: json['id'] as String,
      imageUrl: json['image_url'] as String? ?? '',
      title: json['title'] as String?,
      linkUrl: json['link_url'] as String?,
      isActive: json['is_active'] as bool? ?? true,
      displayOrder: json['display_order'] as int? ?? 0,
      createdAt: json['created_at'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJsonCache() => {
    'id': id,
    'image_url': imageUrl,
    'title': title,
    'link_url': linkUrl,
    'is_active': isActive,
    'display_order': displayOrder,
    'created_at': createdAt,
  };
}
