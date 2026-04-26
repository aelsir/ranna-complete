import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart' hide AuthState;

import 'package:ranna/components/common/ranna_image.dart';
import 'package:ranna/providers/follows_provider.dart';
import 'package:ranna/theme/app_theme.dart';

/// A single followed entity (artist / author / tariqa / fan) with its
/// display metadata resolved from the corresponding table.
class _FollowedEntity {
  final String targetType;
  final String targetId;
  final String name;
  final String? imageUrl;

  const _FollowedEntity({
    required this.targetType,
    required this.targetId,
    required this.name,
    this.imageUrl,
  });
}

/// Segment configuration — drives the section headers and their order.
class _Segment {
  final String targetType;
  final String label;
  final IconData icon;
  final String table;

  const _Segment({
    required this.targetType,
    required this.label,
    required this.icon,
    required this.table,
  });
}

const _segments = [
  _Segment(
    targetType: 'artist',
    label: 'المادحين',
    icon: Icons.mic_rounded,
    table: 'artists',
  ),
  _Segment(
    targetType: 'author',
    label: 'الرواة',
    icon: Icons.menu_book_rounded,
    table: 'authors',
  ),
  _Segment(
    targetType: 'tariqa',
    label: 'الطرق',
    icon: Icons.auto_awesome_rounded,
    table: 'turuq',
  ),
  _Segment(
    targetType: 'fan',
    label: 'الفنون',
    icon: Icons.music_note_rounded,
    table: 'funun',
  ),
];

/// "متابعاتي" — shows everything the user follows, grouped by segment.
/// Each row has an unfollow button on the left side (end side in RTL).
class MyFollowsScreen extends ConsumerStatefulWidget {
  const MyFollowsScreen({super.key});

  @override
  ConsumerState<MyFollowsScreen> createState() => _MyFollowsScreenState();
}

class _MyFollowsScreenState extends ConsumerState<MyFollowsScreen> {
  List<_FollowedEntity>? _entities;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final client = Supabase.instance.client;
    final user = client.auth.currentUser;
    if (user == null) {
      setState(() {
        _loading = false;
        _entities = [];
      });
      return;
    }

    try {
      // 1. Fetch all follow rows for this user.
      final dynamic rows = await client
          .from('user_follows')
          .select('target_type, target_id')
          .eq('user_id', user.id);

      final followRows =
          (rows as List?)?.whereType<Map<String, dynamic>>().toList() ?? [];

      if (followRows.isEmpty) {
        setState(() {
          _loading = false;
          _entities = [];
        });
        return;
      }

      // 2. Group target_ids by type.
      final Map<String, List<String>> idsByType = {};
      for (final r in followRows) {
        final type = r['target_type'] as String;
        final id = r['target_id'] as String;
        idsByType.putIfAbsent(type, () => []).add(id);
      }

      // 3. For each segment that has follows, fetch name + image_url.
      final List<_FollowedEntity> all = [];
      for (final seg in _segments) {
        final ids = idsByType[seg.targetType];
        if (ids == null || ids.isEmpty) continue;

        try {
          final dynamic results = await client
              .from(seg.table)
              .select('id, name, image_url')
              .inFilter('id', ids);

          final list =
              (results as List?)?.whereType<Map<String, dynamic>>().toList() ??
              [];

          for (final r in list) {
            all.add(
              _FollowedEntity(
                targetType: seg.targetType,
                targetId: r['id'] as String,
                name: r['name'] as String? ?? '',
                imageUrl: r['image_url'] as String?,
              ),
            );
          }
        } catch (e) {
          // If a single table fetch fails (e.g. turuq has no image_url
          // column), try without image_url.
          try {
            final dynamic results = await client
                .from(seg.table)
                .select('id, name')
                .inFilter('id', ids);

            final list =
                (results as List?)
                    ?.whereType<Map<String, dynamic>>()
                    .toList() ??
                [];

            for (final r in list) {
              all.add(
                _FollowedEntity(
                  targetType: seg.targetType,
                  targetId: r['id'] as String,
                  name: r['name'] as String? ?? '',
                ),
              );
            }
          } catch (_) {
            debugPrint('⛔ MyFollows: failed to load ${seg.table}');
          }
        }
      }

      if (!mounted) return;
      setState(() {
        _entities = all;
        _loading = false;
      });
    } catch (e) {
      debugPrint('⛔ MyFollowsScreen load error: $e');
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'تعذّر تحميل المتابعات';
      });
    }
  }

  Future<void> _unfollow(_FollowedEntity entity) async {
    try {
      await ref
          .read(followsProvider.notifier)
          .toggle(entity.targetType, entity.targetId);
      // Remove from local list immediately.
      setState(() {
        _entities?.removeWhere(
          (e) =>
              e.targetType == entity.targetType &&
              e.targetId == entity.targetId,
        );
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'تعذّر إلغاء المتابعة. حاول لاحقاً.',
            style: TextStyle(fontFamily: RannaTheme.fontFustat),
          ),
          duration: const Duration(seconds: 2),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: RannaTheme.card,
        body: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Header ──
            Padding(
              padding: const EdgeInsetsDirectional.fromSTEB(16, 16, 20, 8),
              child: Row(
                children: [
                  _CircleBackButton(),
                  const SizedBox(width: 12),
                  Text(
                    'متابعاتي',
                    style: TextStyle(
                      fontFamily: RannaTheme.fontFustat,
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: RannaTheme.foreground,
                    ),
                  ),
                ],
              ),
            ),

            // ── Content ──
            Expanded(child: _buildContent()),
          ],
        ),
      ),
    );
  }

  Widget _buildContent() {
    if (_loading) {
      return const Center(
        child: CircularProgressIndicator(color: RannaTheme.primary),
      );
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(
            _error!,
            style: TextStyle(
              fontFamily: RannaTheme.fontNotoNaskh,
              fontSize: 14,
              color: RannaTheme.mutedForeground,
            ),
          ),
        ),
      );
    }

    final entities = _entities ?? [];
    if (entities.isEmpty) {
      return _buildEmptyState();
    }

    // Build segmented list.
    final List<Widget> children = [];
    for (final seg in _segments) {
      final items = entities
          .where((e) => e.targetType == seg.targetType)
          .toList();
      if (items.isEmpty) continue;
      children.add(_buildSegmentHeader(seg));
      children.add(_buildSegmentCard(items));
      children.add(const SizedBox(height: 20));
    }

    return ListView(
      padding: const EdgeInsetsDirectional.fromSTEB(20, 8, 20, 120),
      children: children,
    );
  }

  Widget _buildSegmentHeader(_Segment seg) {
    return Padding(
      padding: const EdgeInsetsDirectional.fromSTEB(4, 0, 0, 8),
      child: Row(
        children: [
          Icon(seg.icon, size: 16, color: RannaTheme.mutedForeground),
          const SizedBox(width: 6),
          Text(
            seg.label,
            style: TextStyle(
              fontFamily: RannaTheme.fontFustat,
              fontSize: 13,
              fontWeight: FontWeight.bold,
              color: RannaTheme.mutedForeground,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSegmentCard(List<_FollowedEntity> items) {
    return Container(
          decoration: BoxDecoration(
            color: RannaTheme.card,
            borderRadius: BorderRadius.circular(RannaTheme.radius2xl),
            border: Border.all(color: RannaTheme.border.withValues(alpha: 0.6)),
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            children: [
              for (int i = 0; i < items.length; i++) ...[
                _FollowedEntityRow(
                  entity: items[i],
                  onUnfollow: () => _unfollow(items[i]),
                ),
                if (i < items.length - 1)
                  Padding(
                    padding: const EdgeInsetsDirectional.fromSTEB(56, 0, 16, 0),
                    child: Divider(
                      height: 1,
                      color: RannaTheme.border.withValues(alpha: 0.4),
                    ),
                  ),
              ],
            ],
          ),
        )
        .animate()
        .fadeIn(duration: 250.ms)
        .slideY(begin: 0.04, end: 0, duration: 250.ms, curve: Curves.easeOut);
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.people_outline_rounded,
              size: 72,
              color: RannaTheme.mutedForeground.withValues(alpha: 0.3),
            ),
            const SizedBox(height: 24),
            Text(
              'لا توجد متابعات بعد',
              style: TextStyle(
                fontFamily: RannaTheme.fontFustat,
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: RannaTheme.foreground,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'تابع مادحاً أو راوياً أو طريقة لتظهر هنا',
              style: TextStyle(
                fontFamily: RannaTheme.fontNotoNaskh,
                fontSize: 14,
                color: RannaTheme.mutedForeground,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

/// A single row inside a segment card.
class _FollowedEntityRow extends StatelessWidget {
  final _FollowedEntity entity;
  final VoidCallback onUnfollow;

  const _FollowedEntityRow({required this.entity, required this.onUnfollow});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsetsDirectional.fromSTEB(16, 10, 8, 10),
      child: Row(
        children: [
          // Avatar
          ClipOval(
            child: entity.imageUrl != null
                ? RannaImage(
                    url: entity.imageUrl,
                    width: 40,
                    height: 40,
                    fallbackWidget: _fallbackAvatar(),
                  )
                : _fallbackAvatar(),
          ),
          const SizedBox(width: 12),

          // Name
          Expanded(
            child: Text(
              entity.name,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontFamily: RannaTheme.fontFustat,
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: RannaTheme.foreground,
              ),
            ),
          ),

          // Unfollow icon (on the left side in RTL = end side in Row)
          IconButton(
            onPressed: onUnfollow,
            icon: Icon(
              Icons.person_remove_rounded,
              size: 20,
              color: RannaTheme.mutedForeground,
            ),
            tooltip: 'إلغاء المتابعة',
            splashRadius: 20,
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
          ),
        ],
      ),
    );
  }

  Widget _fallbackAvatar() {
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: RannaTheme.primary.withValues(alpha: 0.1),
      ),
      child: Icon(
        _iconForType(entity.targetType),
        size: 22,
        color: RannaTheme.primary,
      ),
    );
  }

  IconData _iconForType(String type) {
    switch (type) {
      case 'artist':
        return Icons.mic_rounded;
      case 'author':
        return Icons.menu_book_rounded;
      case 'tariqa':
        return Icons.auto_awesome_rounded;
      case 'fan':
        return Icons.music_note_rounded;
      default:
        return Icons.person_rounded;
    }
  }
}

/// Circular back button matching the app-wide pattern.
class _CircleBackButton extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        if (context.canPop()) {
          context.pop();
        } else {
          context.go('/account');
        }
      },
      child: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: RannaTheme.muted.withValues(alpha: 0.8),
        ),
        child: const Icon(
          Icons.keyboard_arrow_right_rounded,
          size: 24,
          color: RannaTheme.foreground,
        ),
      ),
    );
  }
}
