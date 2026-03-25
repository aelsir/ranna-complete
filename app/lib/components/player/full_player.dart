import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:ranna/components/common/ranna_image.dart';
import 'package:ranna/components/player/player_controls.dart';
import 'package:ranna/providers/favorites_provider.dart';
import 'package:ranna/services/audio_player_service.dart';
import 'package:ranna/theme/app_theme.dart';
import 'package:ranna/utils/format.dart';
import 'package:ranna/utils/share.dart';

/// Full player overlay with glass-dark styling, rounded-3xl, z-55.
///
/// Layout (top to bottom):
///   1. Header: collapse button + "الآن يُستمع"
///   2. Cover art / Lyrics (toggle)
///   3. Track info (title, artist + narrator)
///   4. Action buttons (favourite, share, lyrics)
///   5. Progress slider with time labels
///   6. [PlayerControls] row
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
  bool _showLyrics = false;

  @override
  void initState() {
    super.initState();
    _entryController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );

    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 60 / 800),
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

    ref.listen<bool>(isFullPlayerOpenProvider, (prev, next) {
      _animateEntry(next);
    });

    if (!isOpen) return const SizedBox.shrink();

    if (!_entryController.isAnimating && _entryController.value == 0) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _animateEntry(true);
      });
    }

    final hasLyrics = track?.lyrics != null && track!.lyrics!.isNotEmpty;

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
                  final coverSize = (h * 0.40).clamp(160.0, 280.0);
                  final glowSize = coverSize * 1.1;
                  final gapLarge = (h * 0.035).clamp(12.0, 32.0);
                  final gapMedium = (h * 0.025).clamp(8.0, 24.0);
                  final gapSmall = (h * 0.018).clamp(6.0, 16.0);

                  return Column(
                    children: [
                      // ===================================================
                      // 1. Header
                      // ===================================================
                      Padding(
                        padding: const EdgeInsetsDirectional.only(
                          start: 8, end: 16, top: 12,
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
                                  color: RannaTheme.primaryForeground
                                      .withValues(alpha: 0.15),
                                ),
                                child: Icon(
                                  Icons.keyboard_arrow_down_rounded,
                                  size: 24,
                                  color: RannaTheme.primaryForeground
                                      .withValues(alpha: 0.70),
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

                      const Spacer(),

                      // ===================================================
                      // 2. Cover art / Lyrics toggle
                      // ===================================================
                      AnimatedBuilder(
                        animation: _coverScaleAnimation,
                        builder: (context, child) {
                          return Transform.scale(
                            scale: _coverScaleAnimation.value,
                            child: child,
                          );
                        },
                        child: AnimatedSwitcher(
                          duration: const Duration(milliseconds: 300),
                          child: _showLyrics && hasLyrics
                              ? _buildLyricsView(track.lyrics!, coverSize)
                              : _buildCoverArt(track, coverSize, glowSize),
                        ),
                      ),

                      SizedBox(height: gapLarge),

                      // ===================================================
                      // 3. Track info
                      // ===================================================
                      Padding(
                        padding: const EdgeInsetsDirectional.symmetric(
                            horizontal: 32),
                        child: Column(
                          children: [
                            Text(
                              track?.title ?? '',
                              style: const TextStyle(
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
                                color: Colors.white.withValues(alpha: 0.50),
                              ),
                              textAlign: TextAlign.center,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),

                      SizedBox(height: gapSmall),

                      // ===================================================
                      // 4. Action buttons (love, share, lyrics)
                      // ===================================================
                      Builder(builder: (context) {
                        final trackId = track?.id;
                        if (trackId == null) return const SizedBox.shrink();

                        final isFav = ref.watch(favoritesProvider).contains(trackId);
                        return Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            // Favorite
                            GestureDetector(
                              onTap: () => ref.read(favoritesProvider.notifier).toggle(trackId),
                              child: SizedBox(
                                width: 44, height: 44,
                                child: Center(
                                  child: Icon(
                                    isFav ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                                    size: 24,
                                    color: isFav
                                        ? RannaTheme.accent
                                        : RannaTheme.primaryForeground.withValues(alpha: 0.40),
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 24),
                            // Share
                            GestureDetector(
                              onTap: () {
                                if (track != null) {
                                  shareTrack(
                                    trackId: track.id,
                                    title: track.title,
                                    artistName: track.madihDetails?.name ?? track.madih,
                                  );
                                }
                              },
                              child: SizedBox(
                                width: 44, height: 44,
                                child: Center(
                                  child: Icon(
                                    Icons.ios_share_rounded,
                                    size: 24,
                                    color: RannaTheme.primaryForeground.withValues(alpha: 0.40),
                                  ),
                                ),
                              ),
                            ),
                            // Lyrics toggle
                            if (hasLyrics) ...[
                              const SizedBox(width: 24),
                              GestureDetector(
                                onTap: () => setState(() => _showLyrics = !_showLyrics),
                                child: SizedBox(
                                  width: 44, height: 44,
                                  child: Center(
                                    child: Icon(
                                      Icons.menu_book_rounded,
                                      size: 24,
                                      color: _showLyrics
                                          ? RannaTheme.accent
                                          : RannaTheme.primaryForeground.withValues(alpha: 0.40),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ],
                        );
                      }),

                      SizedBox(height: gapMedium),

                      // ===================================================
                      // 5. Progress slider
                      // ===================================================
                      Padding(
                        padding: const EdgeInsetsDirectional.symmetric(
                            horizontal: 24),
                        child: Column(
                          children: [
                            SliderTheme(
                              data: SliderThemeData(
                                trackHeight: 4,
                                trackShape: const RoundedRectSliderTrackShape(),
                                activeTrackColor: Colors.white,
                                inactiveTrackColor: RannaTheme.primaryForeground
                                    .withValues(alpha: 0.15),
                                thumbColor: Colors.white,
                                thumbShape: const RoundSliderThumbShape(
                                    enabledThumbRadius: 10),
                                overlayShape: const RoundSliderOverlayShape(
                                    overlayRadius: 20),
                                overlayColor: Colors.white.withValues(alpha: 0.12),
                              ),
                              child: Slider(
                                value: position.inSeconds
                                    .toDouble()
                                    .clamp(0, duration.inSeconds.toDouble().clamp(0, double.infinity)),
                                min: 0,
                                max: duration.inSeconds > 0
                                    ? duration.inSeconds.toDouble()
                                    : 1,
                                onChanged: (value) {
                                  notifier.seekTo(Duration(seconds: value.toInt()));
                                },
                              ),
                            ),
                            Padding(
                              padding: const EdgeInsetsDirectional.symmetric(horizontal: 8),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  // Current time on right (RTL), total on left
                                  Text(
                                    formatDuration(position.inSeconds),
                                    style: TextStyle(
                                      fontFamily: RannaTheme.fontFustat,
                                      fontSize: 11,
                                      color: RannaTheme.primaryForeground
                                          .withValues(alpha: 0.40),
                                    ),
                                  ),
                                  Text(
                                    formatDuration(duration.inSeconds),
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

                      // ===================================================
                      // 6. Player controls
                      // ===================================================
                      const PlayerControls(),

                      const Spacer(),
                    ],
                  );
                },
              ),
            ),
          ),
    );
  }

  Widget _buildCoverArt(dynamic track, double coverSize, double glowSize) {
    return Center(
      key: const ValueKey('cover'),
      child: Stack(
        alignment: Alignment.center,
        children: [
          Container(
            width: glowSize,
            height: glowSize,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(RannaTheme.radius2xl),
              boxShadow: [
                BoxShadow(
                  color: RannaTheme.accent.withValues(alpha: 0.15),
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
              borderRadius: BorderRadius.circular(RannaTheme.radius2xl),
              boxShadow: RannaTheme.shadowLg,
              border: Border.all(
                color: RannaTheme.primaryForeground.withValues(alpha: 0.10),
              ),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(RannaTheme.radius2xl),
              child: track != null
                  ? RannaImage(
                      url: track.imageUrl ?? track.madihDetails?.imageUrl,
                      width: coverSize,
                      height: coverSize,
                      fit: BoxFit.cover,
                      fallbackWidget: _buildFallbackCover(),
                    )
                  : _buildFallbackCover(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLyricsView(String lyrics, double coverSize) {
    return Center(
      key: const ValueKey('lyrics'),
      child: Container(
        width: coverSize + 40,
        height: coverSize,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: RannaTheme.primaryForeground.withValues(alpha: 0.05),
          borderRadius: BorderRadius.circular(RannaTheme.radius2xl),
          border: Border.all(
            color: RannaTheme.primaryForeground.withValues(alpha: 0.08),
          ),
        ),
        child: ShaderMask(
          shaderCallback: (bounds) => LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Colors.transparent,
              Colors.white,
              Colors.white,
              Colors.transparent,
            ],
            stops: const [0.0, 0.08, 0.92, 1.0],
          ).createShader(bounds),
          blendMode: BlendMode.dstIn,
          child: SingleChildScrollView(
            child: Text(
              lyrics,
              style: TextStyle(
                fontFamily: RannaTheme.fontNotoNaskh,
                fontSize: 16,
                height: 2.2,
                color: Colors.white.withValues(alpha: 0.80),
              ),
              textAlign: TextAlign.center,
            ),
          ),
        ),
      ),
    );
  }

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
