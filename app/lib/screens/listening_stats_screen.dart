import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:ranna/components/common/circle_back_button.dart';
import 'package:ranna/components/common/ranna_image.dart';
import 'package:ranna/models/madha.dart';
import 'package:ranna/models/madih.dart';
import 'package:ranna/providers/supabase_providers.dart';
import 'package:ranna/theme/app_theme.dart';
import 'package:ranna/utils/format.dart';

/// Platform listening statistics. Mirrors the web `ListeningStatsPage`:
/// 3 totals cards + top 5 tracks by play_count + top 4 artists alphabetical.
/// Stats are GLOBAL (across all users), matching the web's behavior.
class ListeningStatsScreen extends ConsumerWidget {
  const ListeningStatsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summary = ref.watch(analyticsSummaryProvider);
    final popular = ref.watch(popularTracksProvider);
    final artists = ref.watch(allArtistsProvider);

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: RannaTheme.background,
        body: ListView(
          padding: const EdgeInsetsDirectional.fromSTEB(20, 16, 20, 120),
          children: [
          // ── Header ──
          Row(
            children: [
              const CircleBackButton(),
              const SizedBox(width: 12),
              Text(
                'إحصائيات الاستماع',
                style: TextStyle(
                  fontFamily: RannaTheme.fontFustat,
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: RannaTheme.foreground,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // ── Totals (3 cards) ──
          summary.when(
            loading: () => _buildStatRowShimmer(),
            error: (_, _) => const SizedBox.shrink(),
            data: (s) => Row(
              children: [
                Expanded(
                  child: _StatCard(
                    icon: Icons.headphones_rounded,
                    value: toArabicNum(s.totalPlays),
                    label: 'مرات التشغيل',
                    color: RannaTheme.primary,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _StatCard(
                    icon: Icons.access_time_rounded,
                    value: toArabicNum((s.totalDurationSeconds / 60).round()),
                    label: 'دقائق الاستماع',
                    color: RannaTheme.accent,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _StatCard(
                    icon: Icons.music_note_rounded,
                    value: toArabicNum(s.totalTracks),
                    label: 'المدائح',
                    color: RannaTheme.primary,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 28),

          // ── Top tracks ──
          _buildSectionHeader(
            icon: Icons.trending_up_rounded,
            title: 'الأكثر استماعاً',
          ),
          const SizedBox(height: 10),
          popular.when(
            loading: () => _buildListShimmer(rows: 5),
            error: (_, _) => const SizedBox.shrink(),
            data: (tracks) {
              if (tracks.isEmpty) {
                return _buildSectionEmpty('لا توجد بيانات بعد');
              }
              return _buildCardContainer(
                children: [
                  for (var i = 0; i < tracks.length; i++) ...[
                    _TopTrackRow(track: tracks[i], rank: i + 1),
                    if (i < tracks.length - 1)
                      Padding(
                        padding: const EdgeInsetsDirectional.fromSTEB(56, 0, 16, 0),
                        child: Divider(
                          height: 1,
                          color: RannaTheme.border.withValues(alpha: 0.4),
                        ),
                      ),
                  ],
                ],
              );
            },
          ),
          const SizedBox(height: 28),

          // ── Top artists ──
          _buildSectionHeader(
            icon: Icons.people_alt_rounded,
            title: 'أكثر المدّاحين استماعاً',
          ),
          const SizedBox(height: 10),
          artists.when(
            loading: () => _buildListShimmer(rows: 4),
            error: (_, _) => const SizedBox.shrink(),
            data: (list) {
              final top = list.take(4).toList();
              if (top.isEmpty) {
                return _buildSectionEmpty('لا توجد بيانات بعد');
              }
              return _buildCardContainer(
                children: [
                  for (var i = 0; i < top.length; i++) ...[
                    _TopArtistRow(artist: top[i]),
                    if (i < top.length - 1)
                      Padding(
                        padding: const EdgeInsetsDirectional.fromSTEB(56, 0, 16, 0),
                        child: Divider(
                          height: 1,
                          color: RannaTheme.border.withValues(alpha: 0.4),
                        ),
                      ),
                  ],
                ],
              );
            },
          ),
          ],
        ),
      ),
    );
  }

  // ────────── helpers ──────────

  Widget _buildSectionHeader({required IconData icon, required String title}) {
    return Padding(
      padding: const EdgeInsetsDirectional.fromSTEB(4, 0, 0, 0),
      child: Row(
        children: [
          Icon(icon, size: 16, color: RannaTheme.mutedForeground),
          const SizedBox(width: 6),
          Text(
            title,
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

  Widget _buildCardContainer({required List<Widget> children}) {
    return Container(
      decoration: BoxDecoration(
        color: RannaTheme.card,
        borderRadius: BorderRadius.circular(RannaTheme.radius2xl),
        border: Border.all(color: RannaTheme.border.withValues(alpha: 0.6)),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(children: children),
    ).animate().fadeIn(duration: 250.ms).slideY(
        begin: 0.04, end: 0, duration: 250.ms, curve: Curves.easeOut);
  }

  Widget _buildSectionEmpty(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
      decoration: BoxDecoration(
        color: RannaTheme.card,
        borderRadius: BorderRadius.circular(RannaTheme.radius2xl),
        border: Border.all(color: RannaTheme.border.withValues(alpha: 0.6)),
      ),
      child: Center(
        child: Text(
          text,
          style: TextStyle(
            fontFamily: RannaTheme.fontNotoNaskh,
            fontSize: 13,
            color: RannaTheme.mutedForeground,
          ),
        ),
      ),
    );
  }

  Widget _buildStatRowShimmer() {
    return Row(
      children: List.generate(
        3,
        (i) => Expanded(
          child: Container(
            margin: EdgeInsets.only(left: i < 2 ? 10 : 0),
            height: 96,
            decoration: BoxDecoration(
              color: RannaTheme.muted.withValues(alpha: 0.4),
              borderRadius: BorderRadius.circular(RannaTheme.radius2xl),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildListShimmer({required int rows}) {
    return Container(
      decoration: BoxDecoration(
        color: RannaTheme.card,
        borderRadius: BorderRadius.circular(RannaTheme.radius2xl),
        border: Border.all(color: RannaTheme.border.withValues(alpha: 0.6)),
      ),
      child: Column(
        children: List.generate(
          rows,
          (i) => Container(
            height: 56,
            margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: RannaTheme.muted.withValues(alpha: 0.3),
              borderRadius: BorderRadius.circular(RannaTheme.radiusLg),
            ),
          ),
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String value;
  final String label;
  final Color color;

  const _StatCard({
    required this.icon,
    required this.value,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
      decoration: BoxDecoration(
        color: RannaTheme.card,
        borderRadius: BorderRadius.circular(RannaTheme.radius2xl),
        border: Border.all(color: RannaTheme.border.withValues(alpha: 0.6)),
      ),
      child: Column(
        children: [
          Icon(icon, size: 20, color: color),
          const SizedBox(height: 6),
          Text(
            value,
            style: TextStyle(
              fontFamily: RannaTheme.fontFustat,
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: RannaTheme.foreground,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontFamily: RannaTheme.fontNotoNaskh,
              fontSize: 10,
              color: RannaTheme.mutedForeground,
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 250.ms).slideY(
        begin: 0.04, end: 0, duration: 250.ms, curve: Curves.easeOut);
  }
}

class _TopTrackRow extends StatelessWidget {
  final MadhaWithRelations track;
  final int rank;

  const _TopTrackRow({required this.track, required this.rank});

  @override
  Widget build(BuildContext context) {
    final artist = track.madihDetails?.name ?? track.madih;
    return Padding(
      padding: const EdgeInsetsDirectional.fromSTEB(16, 12, 16, 12),
      child: Row(
        children: [
          SizedBox(
            width: 28,
            child: Text(
              toArabicNum(rank),
              textAlign: TextAlign.center,
              style: TextStyle(
                fontFamily: RannaTheme.fontFustat,
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: RannaTheme.mutedForeground.withValues(alpha: 0.6),
              ),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  track.title,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontFamily: RannaTheme.fontFustat,
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: RannaTheme.foreground,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  artist,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontFamily: RannaTheme.fontNotoNaskh,
                    fontSize: 11,
                    color: RannaTheme.mutedForeground,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 6),
          Icon(Icons.headphones_rounded, size: 14, color: RannaTheme.mutedForeground),
          const SizedBox(width: 4),
          Text(
            toArabicNum(track.playCount),
            style: TextStyle(
              fontFamily: RannaTheme.fontFustat,
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: RannaTheme.mutedForeground,
            ),
          ),
        ],
      ),
    );
  }
}

class _TopArtistRow extends StatelessWidget {
  final Madih artist;

  const _TopArtistRow({required this.artist});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () {},
      child: Padding(
        padding: const EdgeInsetsDirectional.fromSTEB(16, 10, 16, 10),
        child: Row(
          children: [
            ClipOval(
              child: RannaImage(
                url: artist.imageUrl,
                width: 40,
                height: 40,
                fallbackWidget: Container(
                  width: 40,
                  height: 40,
                  color: RannaTheme.primary.withValues(alpha: 0.1),
                  child: Icon(
                    Icons.person_rounded,
                    size: 22,
                    color: RannaTheme.primary,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    artist.name,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontFamily: RannaTheme.fontFustat,
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: RannaTheme.foreground,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'مادح',
                    style: TextStyle(
                      fontFamily: RannaTheme.fontNotoNaskh,
                      fontSize: 11,
                      color: RannaTheme.mutedForeground,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

