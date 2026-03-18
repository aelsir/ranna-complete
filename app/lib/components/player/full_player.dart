import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:ranna/components/common/ranna_image.dart';
import 'package:ranna/components/player/player_controls.dart';
import 'package:ranna/providers/favorites_provider.dart';
import 'package:ranna/services/audio_player_service.dart';
import 'package:ranna/theme/app_theme.dart';
import 'package:ranna/utils/format.dart';

/// Full player overlay with glass-dark styling, rounded-3xl, z-55.
///
/// Fills the content area (parent positions it). Entry animation is a spring
/// slide up from y:60, scale 0.95, opacity 0.
///
/// Layout (top to bottom):
///   1. Header: collapse button + "الآن يُستمع"
///   2. Cover art with coral glow and spring scale animation
///   3. Track info (title, artist + narrator)
///   4. Progress slider with time labels
///   5. [PlayerControls] row
///   6. Favourite heart button
class FullPlayer extends ConsumerStatefulWidget {
  const FullPlayer({super.key});

  @override
  ConsumerState<FullPlayer> createState() => _FullPlayerState();
}

class _FullPlayerState extends ConsumerState<FullPlayer>
    with SingleTickerProviderStateMixin {
  late final AnimationController _entryController;
  late final Animation<Offset> _slideAnimation;
  late final Animation<double> _scaleAnimation;
  late final Animation<double> _opacityAnimation;
  late final Animation<double> _coverScaleAnimation;

  @override
  void initState() {
    super.initState();
    _entryController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );

    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 60 / 800), // normalised y offset
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _entryController,
      curve: Curves.easeOutBack,
    ));

    _scaleAnimation = Tween<double>(begin: 0.95, end: 1.0).animate(
      CurvedAnimation(parent: _entryController, curve: Curves.easeOutBack),
    );

    _opacityAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _entryController,
        curve: const Interval(0.0, 0.5, curve: Curves.easeOut),
      ),
    );

    _coverScaleAnimation = Tween<double>(begin: 0.6, end: 1.0).animate(
      CurvedAnimation(
        parent: _entryController,
        curve: const Interval(0.2, 1.0, curve: Curves.easeOutBack),
      ),
    );
  }

  @override
  void dispose() {
    _entryController.dispose();
    super.dispose();
  }

  void _animateEntry(bool isOpen) {
    if (isOpen) {
      _entryController.forward(from: 0);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isOpen = ref.watch(isFullPlayerOpenProvider);
    final track = ref.watch(currentTrackProvider);
    final position = ref.watch(audioPlayerProvider.select((s) => s.position));
    final duration = ref.watch(audioPlayerProvider.select((s) => s.duration));
    final notifier = ref.read(audioPlayerProvider.notifier);

    // Trigger animation when opened
    ref.listen<bool>(isFullPlayerOpenProvider, (prev, next) {
      _animateEntry(next);
    });

    if (!isOpen) return const SizedBox.shrink();

    // Start animation if first build while open
    if (!_entryController.isAnimating && _entryController.value == 0) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _animateEntry(true);
      });
    }

    return AnimatedBuilder(
      animation: _entryController,
      builder: (context, child) {
        return SlideTransition(
          position: _slideAnimation,
          child: ScaleTransition(
            scale: _scaleAnimation,
            child: FadeTransition(
              opacity: _opacityAnimation,
              child: child,
            ),
          ),
        );
      },
      child: Container(
            decoration: BoxDecoration(
              color: RannaTheme.primary.withValues(alpha: 0.97),
              borderRadius: BorderRadius.circular(RannaTheme.radius3xl),
              border: Border.all(
                color: RannaTheme.primaryForeground.withValues(alpha: 0.05),
              ),
              boxShadow: RannaTheme.shadowFloat,
            ),
            child: SafeArea(
              child: LayoutBuilder(
                builder: (context, constraints) {
                  final h = constraints.maxHeight;
                  // Scale cover art to fit: ~40% of available height, capped at 280
                  final coverSize = (h * 0.40).clamp(160.0, 280.0);
                  final glowSize = coverSize * 1.1;
                  // Scale spacing proportionally
                  final gapLarge = (h * 0.035).clamp(12.0, 32.0);
                  final gapMedium = (h * 0.025).clamp(8.0, 24.0);
                  final gapSmall = (h * 0.018).clamp(6.0, 16.0);

                  return Column(
                    children: [
                      // =====================================================
                      // 1. Header
                      // =====================================================
                      Padding(
                        padding: const EdgeInsetsDirectional.only(
                          start: 8,
                          end: 16,
                          top: 12,
                        ),
                        child: Row(
                          children: [
                            GestureDetector(
                              onTap: () => notifier.closeFullPlayer(),
                              child: Container(
                                width: 40,
                                height: 40,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: Colors.transparent,
                                  border: Border.all(
                                    color: RannaTheme.primaryForeground
                                        .withValues(alpha: 0.1),
                                  ),
                                ),
                                child: Icon(
                                  Icons.keyboard_arrow_down_rounded,
                                  size: 24,
                                  color: RannaTheme.primaryForeground
                                      .withValues(alpha: 0.60),
                                ),
                              ),
                            ),
                            Expanded(
                              child: Text(
                                '\u0627\u0644\u0622\u0646 \u064A\u064F\u0633\u062A\u0645\u0639',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontFamily: RannaTheme.fontFustat,
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: RannaTheme.primaryForeground
                                      .withValues(alpha: 0.50),
                                ),
                              ),
                            ),
                            const SizedBox(width: 40),
                          ],
                        ),
                      ),

                      // =====================================================
                      // 2. Spacer (top)
                      // =====================================================
                      const Spacer(),

                      // =====================================================
                      // 3. Cover art – responsive size
                      // =====================================================
                      AnimatedBuilder(
                        animation: _coverScaleAnimation,
                        builder: (context, child) {
                          return Transform.scale(
                            scale: _coverScaleAnimation.value,
                            child: child,
                          );
                        },
                        child: Center(
                          child: Stack(
                            alignment: Alignment.center,
                            children: [
                              Container(
                                width: glowSize,
                                height: glowSize,
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(
                                      RannaTheme.radius2xl),
                                  boxShadow: [
                                    BoxShadow(
                                      color: RannaTheme.accent
                                          .withValues(alpha: 0.15),
                                      blurRadius: 48,
                                      spreadRadius: 8,
                                    ),
                                  ],
                                ),
                              ),
                              Container(
                                width: coverSize,
                                height: coverSize,
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(
                                      RannaTheme.radius2xl),
                                  boxShadow: RannaTheme.shadowLg,
                                  border: Border.all(
                                    color: RannaTheme.primaryForeground
                                        .withValues(alpha: 0.10),
                                  ),
                                ),
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(
                                      RannaTheme.radius2xl),
                                  child: track != null
                                      ? RannaImage(
                                          url: track.imageUrl ??
                                              track.madihDetails?.imageUrl,
                                          width: coverSize,
                                          height: coverSize,
                                          fit: BoxFit.cover,
                                          fallbackWidget:
                                              _buildFallbackCover(),
                                        )
                                      : _buildFallbackCover(),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),

                      SizedBox(height: gapLarge),

                      // =====================================================
                      // 4. Track info
                      // =====================================================
                      Padding(
                        padding: const EdgeInsetsDirectional.symmetric(
                            horizontal: 32),
                        child: Column(
                          children: [
                            Text(
                              track?.title ?? '',
                              style: TextStyle(
                                fontFamily: RannaTheme.fontFustat,
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                              textAlign: TextAlign.center,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              _buildSubtitle(track),
                              style: TextStyle(
                                fontFamily: RannaTheme.fontFustat,
                                fontSize: 14,
                                color:
                                    Colors.white.withValues(alpha: 0.50),
                              ),
                              textAlign: TextAlign.center,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),

                      SizedBox(height: gapMedium),

                      // =====================================================
                      // 5. Progress slider
                      // =====================================================
                      Padding(
                        padding: const EdgeInsetsDirectional.symmetric(
                            horizontal: 24),
                        child: Column(
                          children: [
                            SliderTheme(
                              data: SliderThemeData(
                                trackHeight: 6,
                                trackShape:
                                    const RoundedRectSliderTrackShape(),
                                activeTrackColor: RannaTheme.accent,
                                inactiveTrackColor:
                                    RannaTheme.primaryForeground
                                        .withValues(alpha: 0.15),
                                thumbColor: RannaTheme.accent,
                                thumbShape:
                                    const RoundSliderThumbShape(
                                        enabledThumbRadius: 8),
                                overlayShape:
                                    const RoundSliderOverlayShape(
                                        overlayRadius: 16),
                                overlayColor: RannaTheme.accent
                                    .withValues(alpha: 0.12),
                              ),
                              child: Slider(
                                value: position.inSeconds
                                    .toDouble()
                                    .clamp(
                                      0,
                                      duration.inSeconds
                                          .toDouble()
                                          .clamp(0, double.infinity),
                                    ),
                                min: 0,
                                max: duration.inSeconds > 0
                                    ? duration.inSeconds.toDouble()
                                    : 1,
                                onChanged: (value) {
                                  notifier.seekTo(
                                      Duration(seconds: value.toInt()));
                                },
                              ),
                            ),
                            Padding(
                              padding:
                                  const EdgeInsetsDirectional.symmetric(
                                      horizontal: 8),
                              child: Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    formatDuration(duration.inSeconds),
                                    style: TextStyle(
                                      fontFamily: RannaTheme.fontFustat,
                                      fontSize: 11,
                                      color: RannaTheme.primaryForeground
                                          .withValues(alpha: 0.40),
                                    ),
                                  ),
                                  Text(
                                    formatDuration(position.inSeconds),
                                    style: TextStyle(
                                      fontFamily: RannaTheme.fontFustat,
                                      fontSize: 11,
                                      color: RannaTheme.primaryForeground
                                          .withValues(alpha: 0.40),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),

                      SizedBox(height: gapSmall),

                      // =====================================================
                      // 6. Player controls
                      // =====================================================
                      const PlayerControls(),

                      SizedBox(height: gapSmall),

                      // =====================================================
                      // 7. Favourite button
                      // =====================================================
                      Builder(builder: (context) {
                        final trackId = track?.id;
                        if (trackId == null) {
                          return const SizedBox.shrink();
                        }
                        final isFav =
                            ref.watch(favoritesProvider).contains(trackId);
                        return GestureDetector(
                          onTap: () {
                            ref
                                .read(favoritesProvider.notifier)
                                .toggle(trackId);
                          },
                          child: Icon(
                            isFav
                                ? Icons.favorite_rounded
                                : Icons.favorite_border_rounded,
                            size: 28,
                            color: isFav
                                ? RannaTheme.accent
                                : RannaTheme.primaryForeground
                                    .withValues(alpha: 0.40),
                          ),
                        );
                      }),

                      // =====================================================
                      // 8. Spacer (bottom)
                      // =====================================================
                      const Spacer(),
                    ],
                  );
                },
              ),
            ),
          ),
    );
  }

  /// Builds the "Artist · Narrator" subtitle string.
  String _buildSubtitle(dynamic track) {
    if (track == null) return '';
    final parts = <String>[];
    final artist = track.madihDetails?.name ?? track.madih;
    if (artist != null && (artist as String).isNotEmpty) parts.add(artist);
    final narrator = track.rawi?.name;
    if (narrator != null && (narrator as String).isNotEmpty) {
      parts.add(narrator);
    }
    return parts.join(' \u00B7 ');
  }

  /// Gradient fallback used when cover art fails to load.
  Widget _buildFallbackCover() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topRight,
          end: Alignment.bottomLeft,
          colors: [RannaTheme.primary, RannaTheme.primaryGlow],
        ),
      ),
      child: const Center(
        child: Icon(
          Icons.music_note_rounded,
          color: Colors.white54,
          size: 64,
        ),
      ),
    );
  }
}
