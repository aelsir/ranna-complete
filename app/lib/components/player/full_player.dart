import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:ranna/components/common/ranna_image.dart';
import 'package:ranna/components/player/player_controls.dart';
import 'package:ranna/models/madha.dart';
import 'package:ranna/providers/favorites_provider.dart';
import 'package:ranna/providers/download_provider.dart';
import 'package:ranna/services/audio_player_service.dart';
import 'package:ranna/theme/app_theme.dart';
import 'package:ranna/utils/format.dart';
import 'package:ranna/utils/haptics.dart';
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

    _slideAnimation =
        Tween<Offset>(
          begin: const Offset(0, 1.0),
          end: Offset.zero,
        ).animate(
          CurvedAnimation(
            parent: _entryController, 
            curve: Curves.easeOutCubic,
            reverseCurve: Curves.easeInCubic,
          ),
        );

    _scaleAnimation = Tween<double>(begin: 0.95, end: 1.0).animate(
      CurvedAnimation(
        parent: _entryController, 
        curve: Curves.easeOutCubic,
        reverseCurve: Curves.easeInCubic,
      ),
    );

    _opacityAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _entryController,
        curve: const Interval(0.0, 0.5, curve: Curves.easeOut),
        reverseCurve: const Interval(0.5, 1.0, curve: Curves.easeIn),
      ),
    );

    _coverScaleAnimation = Tween<double>(begin: 0.6, end: 1.0).animate(
      CurvedAnimation(
        parent: _entryController,
        curve: const Interval(0.2, 1.0, curve: Curves.easeOutCubic),
        reverseCurve: Curves.easeInCubic,
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
      // Check if lyrics should be shown on open
      if (next && ref.read(audioPlayerProvider).showLyricsOnOpen) {
        _showLyrics = true;
        ref.read(audioPlayerProvider.notifier).consumeShowLyricsOnOpen();
      }
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
            child: FadeTransition(opacity: _opacityAnimation, child: child),
          ),
        );
      },
      child: GestureDetector(
        onVerticalDragUpdate: (details) {
          double fraction = details.primaryDelta! / MediaQuery.of(context).size.height;
          _entryController.value -= fraction * 1.2;
        },
        onVerticalDragEnd: (details) {
          if ((details.primaryVelocity ?? 0) > 300 || _entryController.value < 0.6) {
            _entryController.reverse().then((_) {
              if (mounted) notifier.closeFullPlayer();
            });
          } else {
            _entryController.forward();
          }
        },
        child: Container(
          decoration: BoxDecoration(
            // AMOLED full-player gradient: #111 at the top fades down to
            // pure black at the bottom — feels cinematic against the cover
            // art and matches the spec.
            gradient: RannaTheme.fullPlayerGradient,
            borderRadius: BorderRadius.circular(RannaTheme.radius3xl),
            border: Border.all(color: RannaTheme.border),
            boxShadow: RannaTheme.shadowFloat,
          ),
          child: SafeArea(
            child: LayoutBuilder(
              builder: (context, constraints) {
                final h = constraints.maxHeight;
                final isSmall = h < 650;
                
                final coverSize = isSmall ? (h * 0.35).clamp(120.0, 240.0) : (h * 0.40).clamp(200.0, 320.0);
                final glowSize = coverSize * 1.1;
                final gapLarge = (h * 0.035).clamp(12.0, 40.0);
                final gapMedium = (h * 0.025).clamp(8.0, 24.0);
                final gapSmall = (h * 0.018).clamp(4.0, 16.0);

                return Stack(
                  children: [
                    // Main Scrollable Content
                    SingleChildScrollView(
                      physics: const ClampingScrollPhysics(),
                      child: ConstrainedBox(
                        constraints: BoxConstraints(minHeight: h),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            SizedBox(height: isSmall ? 24 : 40),
                            
                            // ===================================================
                            // 1. Cover art / Lyrics toggle
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
                            // 2. Track info
                            // ===================================================
                            Padding(
                              padding: const EdgeInsetsDirectional.symmetric(
                                horizontal: 32,
                              ),
                              child: Column(
                                children: [
                                  ScrollingTitle(
                                    text: track?.title ?? '',
                                    style: TextStyle(
                                      fontFamily: RannaTheme.fontFustat,
                                      fontSize: isSmall ? 18 : 22,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                  _buildSubtitleWidget(context, notifier, track),
                                ],
                              ),
                            ),

                            SizedBox(height: gapSmall),

                            // ===================================================
                            // 3. Action buttons (love, share, download, lyrics)
                            // ===================================================
                            Builder(
                              builder: (context) {
                                final trackId = track?.id;
                                if (trackId == null) return const SizedBox.shrink();

                                final isFav = ref
                                    .watch(favoritesProvider)
                                    .contains(trackId);
                                return Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    // Favorite
                                    GestureDetector(
                                      onTap: () {
                                        isFav ? Haptics.selection() : Haptics.light();
                                        ref
                                            .read(favoritesProvider.notifier)
                                            .toggle(trackId);
                                      },
                                      child: SizedBox(
                                        width: 44,
                                        height: 44,
                                        child: Center(
                                          child: Icon(
                                            isFav
                                                ? Icons.favorite_rounded
                                                : Icons.favorite_border_rounded,
                                            size: 24,
                                            color: isFav
                                                ? RannaTheme.favoriteHeart
                                                : RannaTheme.primaryForeground.withValues(
                                                    alpha: 0.40,
                                                  ),
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
                                            artistName:
                                                track.madihDetails?.name ?? track.madih,
                                          );
                                        }
                                      },
                                      child: SizedBox(
                                        width: 44,
                                        height: 44,
                                        child: Center(
                                          child: Icon(
                                            Icons.ios_share_rounded,
                                            size: 24,
                                            color: RannaTheme.primaryForeground.withValues(alpha: 0.40),
                                          ),
                                        ),
                                      ),
                                    ),
                                    // Download
                                    const SizedBox(width: 24),
                                    _FullPlayerDownloadButton(track: track),
                                    // Lyrics toggle
                                    if (hasLyrics) ...[
                                      const SizedBox(width: 24),
                                      GestureDetector(
                                        onTap: () {
                                          Haptics.selection();
                                          setState(() => _showLyrics = !_showLyrics);
                                        },
                                        child: SizedBox(
                                          width: 44,
                                          height: 44,
                                          child: Center(
                                            child: Icon(
                                              Icons.menu_book_rounded,
                                              size: 24,
                                              color: _showLyrics
                                                  ? RannaTheme.accent
                                                  : RannaTheme.primaryForeground
                                                        .withValues(alpha: 0.40),
                                            ),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ],
                                );
                              },
                            ),

                            SizedBox(height: gapMedium),

                            // ===================================================
                            // 4. Progress slider
                            // ===================================================
                            Padding(
                              padding: const EdgeInsetsDirectional.symmetric(
                                horizontal: 24,
                              ),
                              child: _ProgressSlider(
                                position: position,
                                duration: duration,
                                onSeek: notifier.seekTo,
                              ),
                            ),

                            SizedBox(height: gapSmall),

                            // ===================================================
                            // 5. Player controls
                            // ===================================================
                            const PlayerControls(),

                            SizedBox(height: isSmall ? 16 : 40),
                          ],
                        ),
                      ),
                    ),

                    // ===================================================
                    // Floating Down Button (Close) at top start
                    // ===================================================
                    PositionedDirectional(
                      top: 16,
                      start: 16,
                      child: GestureDetector(
                        onTap: () {
                          _entryController.reverse().then((_) {
                            if (mounted) notifier.closeFullPlayer();
                          });
                        },
                        child: Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: Colors.black.withValues(alpha: 0.25),
                            border: Border.all(
                              color: Colors.white.withValues(alpha: 0.1),
                            ),
                          ),
                          child: const Icon(
                            Icons.keyboard_arrow_down_rounded,
                            size: 28,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                  ],
                );
              },
            ),
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
                      url: track.resolvedImageUrl,
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

  Widget _buildSubtitleWidget(
    BuildContext context,
    AudioPlayerService notifier,
    MadhaWithRelations? track,
  ) {
    if (track == null) return const SizedBox.shrink();

    final artistName = track.madihDetails?.name ?? track.madih;
    final narratorName = track.rawi?.name;

    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Wrap(
        alignment: WrapAlignment.center,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          if (artistName.isNotEmpty)
            GestureDetector(
              onTap: () {
                if (track.madihId != null) {
                  notifier.closeFullPlayer();
                  context.push('/profile/artist/${track.madihId}');
                }
              },
              child: Text(
                artistName,
                style: TextStyle(
                  fontFamily: RannaTheme.fontFustat,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: Colors.white.withValues(alpha: 0.60),
                ),
              ),
            ),
          if (artistName.isNotEmpty && narratorName != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Text(
                '·',
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.30),
                  fontSize: 14,
                ),
              ),
            ),
          if (narratorName != null)
            GestureDetector(
              onTap: () {
                if (track.rawiId != null) {
                  notifier.closeFullPlayer();
                  context.push('/profile/narrator/${track.rawiId}');
                }
              },
              child: Text(
                narratorName,
                style: TextStyle(
                  fontFamily: RannaTheme.fontFustat,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: Colors.white.withValues(alpha: 0.60),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildFallbackCover() {
    return Container(
      color: RannaTheme.muted,
      child: Center(
        child: Image.asset(
          'assets/images/logo-ranna.png',
          width: 120,
          height: 120,
          fit: BoxFit.contain,
          errorBuilder: (_, _, _) => const Icon(
            Icons.music_note_rounded,
            color: RannaTheme.primary,
            size: 64,
          ),
        ),
      ),
    );
  }
}

class ScrollingTitle extends StatefulWidget {
  final String text;
  final TextStyle style;

  const ScrollingTitle({
    super.key,
    required this.text,
    required this.style,
  });

  @override
  State<ScrollingTitle> createState() => _ScrollingTitleState();
}

class _ScrollingTitleState extends State<ScrollingTitle> {
  late ScrollController _scrollController;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController();
    _startScrollingAfterDelay();
  }

  @override
  void didUpdateWidget(ScrollingTitle oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.text != widget.text) {
      _resetScroll();
      _startScrollingAfterDelay();
    }
  }

  void _resetScroll() {
    _timer?.cancel();
    if (_scrollController.hasClients) {
      _scrollController.jumpTo(0);
    }
  }

  void _startScrollingAfterDelay() {
    _timer?.cancel();
    _timer = Timer(const Duration(seconds: 2), () {
      _scroll();
    });
  }

  void _scroll() async {
    if (!mounted || !_scrollController.hasClients) return;

    final maxExtent = _scrollController.position.maxScrollExtent;
    if (maxExtent <= 0) return;

    // Scroll to end
    await _scrollController.animateTo(
      maxExtent,
      duration: Duration(milliseconds: (maxExtent * 50).toInt()),
      curve: Curves.linear,
    );

    if (!mounted) return;
    await Future.delayed(const Duration(seconds: 1));

    // Scroll back to start
    if (!mounted) return;
    await _scrollController.animateTo(
      0,
      duration: const Duration(seconds: 1),
      curve: Curves.easeInOut,
    );

    // Restart after a small delay
    if (!mounted) return;
    _timer = Timer(const Duration(seconds: 2), () {
      _scroll();
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      controller: _scrollController,
      scrollDirection: Axis.horizontal,
      physics: const NeverScrollableScrollPhysics(), // Only auto-scroll
      child: Text(
        widget.text,
        style: widget.style,
        maxLines: 1,
      ),
    );
  }
}

/// Interactive progress slider that uses local drag state to prevent
/// the thumb from bouncing back during seek operations.
class _ProgressSlider extends StatefulWidget {
  final Duration position;
  final Duration duration;
  final Future<void> Function(Duration) onSeek;

  const _ProgressSlider({
    required this.position,
    required this.duration,
    required this.onSeek,
  });

  @override
  State<_ProgressSlider> createState() => _ProgressSliderState();
}

class _ProgressSliderState extends State<_ProgressSlider> {
  bool _isDragging = false;
  double _dragValue = 0;

  @override
  Widget build(BuildContext context) {
    final maxMs = widget.duration.inMilliseconds > 0
        ? widget.duration.inMilliseconds.toDouble()
        : 1.0;

    // While dragging, show the local drag value; otherwise follow the stream.
    final currentValue = _isDragging
        ? _dragValue
        : widget.position.inMilliseconds.toDouble().clamp(0.0, maxMs);

    // Time label: show drag position during drag, otherwise real position
    final displayMs = _isDragging ? _dragValue.toInt() : widget.position.inMilliseconds;
    final displaySeconds = (displayMs / 1000).round();

    return Column(
      children: [
        SliderTheme(
          data: SliderThemeData(
            trackHeight: 4,
            trackShape: const RoundedRectSliderTrackShape(),
            activeTrackColor: Colors.white,
            inactiveTrackColor:
                RannaTheme.primaryForeground.withValues(alpha: 0.40),
            secondaryActiveTrackColor:
                Colors.white.withValues(alpha: 0.30),
            thumbColor: Colors.white,
            thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 10),
            overlayShape: const RoundSliderOverlayShape(overlayRadius: 20),
            overlayColor: Colors.white.withValues(alpha: 0.12),
            // Tick marks — hidden but must be white to avoid black fallback
            activeTickMarkColor: Colors.transparent,
            inactiveTickMarkColor: Colors.transparent,
            // Value indicator (tooltip on drag)
            valueIndicatorColor: RannaTheme.card,
            valueIndicatorTextStyle: const TextStyle(color: Colors.white),
            // Disabled states
            disabledThumbColor: Colors.white.withValues(alpha: 0.40),
            disabledActiveTrackColor: Colors.white.withValues(alpha: 0.30),
            disabledInactiveTrackColor:
                Colors.white.withValues(alpha: 0.15),
          ),
          child: Slider(
            value: currentValue.toDouble().clamp(0.0, maxMs),
            min: 0,
            max: maxMs,
            onChangeStart: (value) {
              setState(() {
                _isDragging = true;
                _dragValue = value;
              });
            },
            onChanged: (value) {
              setState(() => _dragValue = value);
            },
            onChangeEnd: (value) {
              Haptics.selection();
              setState(() => _isDragging = false);
              widget.onSeek(Duration(milliseconds: value.toInt()));
            },
          ),
        ),
        Padding(
          padding: const EdgeInsetsDirectional.symmetric(horizontal: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                formatDuration(displaySeconds),
                style: TextStyle(
                  fontFamily: RannaTheme.fontFustat,
                  fontSize: 11,
                  color: RannaTheme.primaryForeground.withValues(alpha: 0.40),
                ),
              ),
              Text(
                formatDuration(widget.duration.inSeconds),
                style: TextStyle(
                  fontFamily: RannaTheme.fontFustat,
                  fontSize: 11,
                  color: RannaTheme.primaryForeground.withValues(alpha: 0.40),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Download button for the full player action row.
class _FullPlayerDownloadButton extends ConsumerWidget {
  final MadhaWithRelations? track;
  const _FullPlayerDownloadButton({required this.track});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (track == null) return const SizedBox.shrink();

    final isDownloaded = ref.watch(downloadedTrackIdsProvider).contains(track!.id);
    final progress = ref.watch(activeDownloadsProvider)[track!.id];
    final isDownloading = progress != null;

    if (isDownloaded) {
      return SizedBox(
        width: 44,
        height: 44,
        child: Center(
          child: Icon(Icons.check_circle_rounded, size: 24, color: RannaTheme.accent),
        ),
      );
    }

    if (isDownloading) {
      return GestureDetector(
        onTap: () {
          ref.read(downloadServiceProvider).cancelDownload(track!.id);
          ref.read(activeDownloadsProvider.notifier).remove(track!.id);
        },
        child: SizedBox(
          width: 44,
          height: 44,
          child: Center(
            child: SizedBox(
              width: 22,
              height: 22,
              child: CircularProgressIndicator(
                value: progress > 0 ? progress : null,
                strokeWidth: 2.5,
                valueColor: AlwaysStoppedAnimation(RannaTheme.accent),
                backgroundColor: RannaTheme.primaryForeground.withValues(alpha: 0.1),
              ),
            ),
          ),
        ),
      );
    }

    return GestureDetector(
      onTap: () async {
        try {
          await startDownload(ref, track!);
        } catch (_) {}
      },
      child: SizedBox(
        width: 44,
        height: 44,
        child: Center(
          child: Icon(
            Icons.download_rounded,
            size: 24,
            color: RannaTheme.primaryForeground.withValues(alpha: 0.40),
          ),
        ),
      ),
    );
  }
}
