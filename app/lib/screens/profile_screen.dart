import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:ranna/components/common/ranna_image.dart';
import 'package:ranna/components/common/shimmer_loading.dart';
import 'package:ranna/components/track/play_all_button.dart';
import 'package:ranna/components/track/track_row.dart';
import 'package:ranna/models/madha.dart';
import 'package:ranna/providers/auth_notifier.dart';
import 'package:ranna/providers/follows_provider.dart';
import 'package:ranna/providers/supabase_providers.dart';
import 'package:ranna/theme/app_theme.dart';
import 'package:ranna/utils/format.dart';

/// Artist or Narrator profile page.
///
/// Displays a hero cover image, play-all action row, and a scrollable
/// list of tracks belonging to the selected artist or narrator.
class ProfileScreen extends ConsumerWidget {
  final String type;
  final String id;

  const ProfileScreen({super.key, required this.type, required this.id});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isArtist = type == 'artist';

    // Separate watches to preserve concrete types
    final tracksAsync = isArtist
        ? ref.watch(artistTracksProvider(id))
        : ref.watch(narratorTracksProvider(id));

    // Extract name/imageUrl based on type
    String? name;
    String? imageUrl;
    bool isLoading = false;
    bool hasError = false;

    if (isArtist) {
      final artistAsync = ref.watch(artistDetailProvider(id));
      artistAsync.when(
        loading: () => isLoading = true,
        error: (_, _) => hasError = true,
        data: (artist) {
          if (artist != null) {
            name = artist.name;
            imageUrl = artist.imageUrl;
          } else {
            hasError = true;
          }
        },
      );
    } else {
      final narratorAsync = ref.watch(narratorDetailProvider(id));
      narratorAsync.when(
        loading: () => isLoading = true,
        error: (_, _) => hasError = true,
        data: (narrator) {
          if (narrator != null) {
            name = narrator.name;
            imageUrl = narrator.imageUrl;
          } else {
            hasError = true;
          }
        },
      );
    }

    if (isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (hasError || name == null) {
      return Scaffold(
        backgroundColor: RannaTheme.background,
        body: Center(
          child: Text(
            'حدث خطأ',
            style: Theme.of(context).textTheme.titleMedium,
          ),
        ),
      );
    }

    final resolvedName = name!;
    final resolvedImageUrl = getImageUrl(imageUrl);

    return Scaffold(
      backgroundColor: RannaTheme.background,
      body: tracksAsync.when(
        loading: () => CustomScrollView(
          slivers: [
            _buildAppBar(context: context, imageUrl: resolvedImageUrl),
            SliverList(
              delegate: SliverChildBuilderDelegate(
                (_, _) => const ShimmerTrackRow(),
                childCount: 8,
              ),
            ),
          ],
        ),
        error: (_, _) => Center(
          child: Text(
            'حدث خطأ',
            style: Theme.of(context).textTheme.titleMedium,
          ),
        ),
        data: (tracks) =>
            _buildBody(context, ref, resolvedName, resolvedImageUrl, tracks),
      ),
    );
  }

  /// Hero image with a bottom-up fade into the page background — mirrors
  /// the web design where the photo blends seamlessly into the page rather
  /// than ending in a hard horizon. Title and track count are rendered
  /// below the hero in `_buildBody`, not overlaid on the image.
  SliverAppBar _buildAppBar({
    required BuildContext context,
    required String imageUrl,
    String? name,
    String? roleLabel,
    int? trackCount,
  }) {
    return SliverAppBar(
      expandedHeight: 280,
      pinned: true,
      stretch: true,
      backgroundColor: RannaTheme.background,
      surfaceTintColor: Colors.transparent,
      leading: Padding(
        padding: const EdgeInsets.all(8.0),
        child: GestureDetector(
          onTap: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/');
            }
          },
          child: Container(
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
        ),
      ),
      flexibleSpace: FlexibleSpaceBar(
        // Title goes in `title:` (not as a Positioned in `background:`) so
        // that when the user scrolls and the bar collapses, Flutter
        // animates the text into the toolbar slot with the correct
        // foreground styling. Putting the name in `background` instead
        // made it disappear on collapse — the background fades out, and
        // there was no title to take its place.
        centerTitle: false,
        titlePadding: const EdgeInsetsDirectional.only(
          start: 64,
          bottom: 16,
          end: 16,
        ),
        title: name == null
            ? null
            : Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    style: const TextStyle(
                      fontFamily: RannaTheme.fontFustat,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '$roleLabel · ${toArabicNum(trackCount ?? 0)} مقطع',
                    style: TextStyle(
                      fontFamily: RannaTheme.fontNotoNaskh,
                      fontSize: 11,
                      color: Colors.white.withValues(alpha: 0.7),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
        background: Stack(
          fit: StackFit.expand,
          children: [
            if (imageUrl.isNotEmpty)
              RannaImage(
                url: imageUrl,
                width: double.infinity,
                height: 280,
                fit: BoxFit.cover,
                fallbackWidget: Container(color: RannaTheme.primary),
              )
            else
              Container(color: RannaTheme.primary),
            // White-to-transparent fade at bottom that bleeds the photo
            // into the page background. Mirrors web's `bg-gradient-to-t
            // from-background via-background/30 to-transparent`.
            Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.bottomCenter,
                  end: Alignment.topCenter,
                  stops: const [0.0, 0.45, 1.0],
                  colors: [
                    RannaTheme.background,
                    RannaTheme.background.withValues(alpha: 0.3),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBody(
    BuildContext context,
    WidgetRef ref,
    String name,
    String imageUrl,
    List<MadhaWithRelations> tracks,
  ) {
    final roleLabel = type == 'artist' ? 'مادح' : 'راوي';
    final followType = type == 'artist' ? 'artist' : 'author';

    return CustomScrollView(
      slivers: [
        _buildAppBar(
          context: context,
          imageUrl: imageUrl,
          name: name,
          roleLabel: roleLabel,
          trackCount: tracks.length,
        ),

        // Action row: Play button on the right (start in RTL), Follow on left.
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsetsDirectional.fromSTEB(20, 8, 20, 8),
            child: Row(
              children: [
                PlayAllButton.compact(tracks: tracks),
                const Spacer(),
                _FollowButton(targetType: followType, targetId: id),
              ],
            ),
          ),
        ),

        // Track list
        SliverList(
          delegate: SliverChildBuilderDelegate(
            (context, index) =>
                TrackRow(track: tracks[index], index: index, queue: tracks),
            childCount: tracks.length,
          ),
        ),

        // Bottom padding for mini player + nav bar
        const SliverToBoxAdapter(child: SizedBox(height: 120)),
      ],
    );
  }
}

// =============================================================================
// Action-row components
// =============================================================================

/// Outlined Follow / Following toggle. Tapping flips the state with an
/// optimistic update + Supabase write. On the unfollowed → followed
/// transition we run a small celebration: a haptic tap + a burst of three
/// faded sparkles radiating from the button.
class _FollowButton extends ConsumerStatefulWidget {
  final String targetType; // 'artist' | 'author' | 'tariqa' | 'fan'
  final String targetId;

  const _FollowButton({required this.targetType, required this.targetId});

  @override
  ConsumerState<_FollowButton> createState() => _FollowButtonState();
}

class _FollowButtonState extends ConsumerState<_FollowButton> {
  /// Bumped each time we follow (NOT each time we unfollow). Drives the
  /// `.animate(target: 1)` re-run on the celebration overlay.
  int _celebrateTick = 0;
  bool _busy = false;

  Future<void> _onTap() async {
    if (_busy) return;

    // Gate: following requires a real (email-bound) account. Anonymous users
    // are routed to the account tab, which presents the inline login + the
    // "إنشاء حساب جديد" signup link side by side. We surface a snackbar so
    // the redirect isn't silent.
    final auth = ref.read(authNotifierProvider);
    final isRealUser = auth.user != null && !auth.isAnonymous;
    if (!isRealUser) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'سجّل دخولك للمتابعة',
            style: TextStyle(fontFamily: RannaTheme.fontFustat),
          ),
          duration: const Duration(seconds: 2),
          behavior: SnackBarBehavior.floating,
        ),
      );
      context.go('/account');
      return;
    }

    setState(() => _busy = true);
    final wasFollowing = ref.read(
      isFollowingProvider((type: widget.targetType, id: widget.targetId)),
    );
    try {
      final nowFollowing = await ref
          .read(followsProvider.notifier)
          .toggle(widget.targetType, widget.targetId);
      if (!mounted) return;
      if (nowFollowing && !wasFollowing) {
        // Celebrate.
        HapticFeedback.lightImpact();
        setState(() => _celebrateTick++);
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'تعذّر تحديث المتابعة. حاول لاحقاً.',
            style: TextStyle(fontFamily: RannaTheme.fontFustat),
          ),
          duration: const Duration(seconds: 2),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isFollowing = ref.watch(
      isFollowingProvider((type: widget.targetType, id: widget.targetId)),
    );
    final label = isFollowing ? 'تتابعه' : 'تابـــــع';
    final fg = isFollowing ? RannaTheme.background : RannaTheme.primary;
    final bg = isFollowing ? RannaTheme.primary : Colors.transparent;
    final borderColor = RannaTheme.primary;

    return Stack(
      clipBehavior: Clip.none,
      alignment: Alignment.center,
      children: [
        // ── Sparkle celebration burst (3 staggered icons) ──
        if (_celebrateTick > 0) ...[
          _Sparkle(
            tick: _celebrateTick,
            offset: const Offset(-44, -22),
            delay: const Duration(milliseconds: 0),
          ),
          _Sparkle(
            tick: _celebrateTick,
            offset: const Offset(44, -28),
            delay: const Duration(milliseconds: 90),
          ),
          _Sparkle(
            tick: _celebrateTick,
            offset: const Offset(0, -50),
            delay: const Duration(milliseconds: 50),
          ),
        ],

        // ── The button itself ──
        AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              curve: Curves.easeOut,
              decoration: BoxDecoration(
                color: bg,
                borderRadius: BorderRadius.circular(RannaTheme.radiusFull),
                border: Border.all(color: borderColor, width: 1.5),
              ),
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  borderRadius: BorderRadius.circular(RannaTheme.radiusFull),
                  onTap: _onTap,
                  child: Padding(
                    padding: const EdgeInsetsDirectional.fromSTEB(14, 6, 14, 6),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (isFollowing) ...[
                          Icon(Icons.check_rounded, size: 18, color: fg),
                          const SizedBox(width: 8),
                        ],
                        Text(
                          label,
                          style: TextStyle(
                            fontFamily: RannaTheme.fontFustat,
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: fg,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            )
            // Tiny scale bounce when state flips (re-runs whenever
            // `isFollowing`'s string key changes).
            .animate(key: ValueKey('follow-$isFollowing-${widget.targetId}'))
            .scaleXY(
              begin: 0.94,
              end: 1.0,
              duration: 180.ms,
              curve: Curves.easeOutBack,
            ),
      ],
    );
  }
}

/// One sparkle in the celebration burst — appears, drifts outward, fades.
class _Sparkle extends StatelessWidget {
  final int tick;
  final Offset offset;
  final Duration delay;

  const _Sparkle({
    required this.tick,
    required this.offset,
    required this.delay,
  });

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Transform.translate(
        offset: offset,
        child:
            Icon(Icons.auto_awesome_rounded, size: 18, color: RannaTheme.accent)
                .animate(key: ValueKey('sparkle-$tick-${offset.dx}'))
                .fadeIn(duration: 120.ms, delay: delay)
                .scaleXY(
                  begin: 0.4,
                  end: 1.0,
                  duration: 280.ms,
                  delay: delay,
                  curve: Curves.easeOutBack,
                )
                .then()
                .fadeOut(duration: 280.ms)
                .moveY(begin: 0, end: -10, duration: 280.ms),
      ),
    );
  }
}
