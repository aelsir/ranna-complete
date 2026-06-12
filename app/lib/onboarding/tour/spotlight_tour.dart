/// Spotlight tour overlay — the in-context "mini onboarding".
///
/// Dims the whole screen, cuts a rounded hole around the target widget with
/// a gold ring (the same gold the access system uses for member features),
/// and shows a card styled after the access gate sheet: 42px tinted icon
/// square, Kufam title, light body, pink pill CTA.
///
/// Pushed on the ROOT navigator (like `showAccessGateSheet`) so it sits above
/// the shell's floating chrome — bottom nav, mini player, full player.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:ranna/onboarding/tour/tour_controller.dart';
import 'package:ranna/theme/app_theme.dart';
import 'package:ranna/utils/format.dart';
import 'package:ranna/utils/haptics.dart';

/// One spotlighted step: where to point, and what to say.
class TourStep {
  final String id; // a TourStepIds value — drives the persisted "seen" flag
  final GlobalKey targetKey;
  final IconData icon;
  final String title;
  final String body;

  /// Corner radius of the highlight. Pass the target's OWN border radius
  /// (e.g. `RannaTheme.radius3xl` for the mini player, `radiusFull` for
  /// circular icon buttons) so the gold stroke hugs the element's edge and
  /// reads as the element's border changing color, not a box drawn around it.
  final double holeRadius;

  const TourStep({
    required this.id,
    required this.targetKey,
    required this.icon,
    required this.title,
    required this.body,
    this.holeRadius = RannaTheme.radiusLg,
  });
}

/// Show a spotlight tour if its targets are on screen and the session rules
/// allow it. Handles begin/end bookkeeping on the [TourController]; callers
/// only build the steps. No-op (returns false) when nothing can show.
bool maybeShowSpotlightTour(
  BuildContext context,
  WidgetRef ref, {
  required String tourName,
  required List<TourStep> steps,
}) {
  final tours = ref.read(tourControllerProvider);

  // Only steps that are unseen AND currently laid out on screen.
  final visible = steps.where((s) {
    if (tours.seen(s.id)) return false;
    final box = s.targetKey.currentContext?.findRenderObject();
    return box is RenderBox && box.attached && box.hasSize;
  }).toList();

  if (!tours.canStart(tourName, visible.map((s) => s.id))) return false;

  tours.begin(tourName);
  Haptics.light();
  Navigator.of(context, rootNavigator: true)
      .push<void>(
        PageRouteBuilder<void>(
          opaque: false,
          barrierDismissible: false,
          pageBuilder: (context, animation, secondaryAnimation) =>
              _SpotlightTourScreen(tourName: tourName, steps: visible),
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            return FadeTransition(
              opacity: CurvedAnimation(
                parent: animation,
                curve: Curves.easeOut,
              ),
              child: child,
            );
          },
          transitionDuration: const Duration(milliseconds: 280),
          reverseTransitionDuration: const Duration(milliseconds: 200),
        ),
      )
      .whenComplete(tours.end);
  return true;
}

class _SpotlightTourScreen extends ConsumerStatefulWidget {
  final String tourName;
  final List<TourStep> steps;

  const _SpotlightTourScreen({required this.tourName, required this.steps});

  @override
  ConsumerState<_SpotlightTourScreen> createState() =>
      _SpotlightTourScreenState();
}

class _SpotlightTourScreenState extends ConsumerState<_SpotlightTourScreen> {
  int _index = 0;

  TourStep get _step => widget.steps[_index];
  bool get _isLast => _index == widget.steps.length - 1;

  TourController get _tours => ref.read(tourControllerProvider);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _publishActiveStep());
  }

  /// Tell the spotlighted widget it's on stage — it watches
  /// [activeTourStepProvider] and renders its "activated" look (gold icon,
  /// red heart, gold border) while its step is showing. Cleared by
  /// [TourController.end], which runs on every exit path of the tour route.
  void _publishActiveStep() {
    if (!mounted) return;
    _tours.setActiveStep(_step.id);
  }

  Rect? _targetRect() {
    final obj = _step.targetKey.currentContext?.findRenderObject();
    if (obj is! RenderBox || !obj.attached || !obj.hasSize) return null;
    return obj.localToGlobal(Offset.zero) & obj.size;
  }

  void _next() {
    Haptics.selection();
    _tours.markSeen(_step.id);
    _tours.trackStepDone(widget.tourName, _step.id);
    if (_isLast) {
      Navigator.of(context).pop();
    } else {
      setState(() => _index++);
      _publishActiveStep();
    }
  }

  void _skip() {
    Haptics.selection();
    _tours.trackSkipped(widget.tourName, _step.id);
    // Skip = "I get it, stop teaching" — never show any remaining step again.
    for (final s in widget.steps) {
      _tours.markSeen(s.id);
    }
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final rect = _targetRect();
    if (rect == null) {
      // Target vanished mid-tour (track changed, screen popped). Bail out
      // quietly without burning the step's one showing.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) Navigator.of(context).pop();
      });
      return const SizedBox.shrink();
    }

    final screen = MediaQuery.of(context).size;
    // Tight inflation — the gold stroke should sit ON the element's edge,
    // as if the element's own border changed color.
    final hole = rect.inflate(2);
    // Card above or below the target, whichever side has more room.
    final cardBelow = rect.center.dy < screen.height / 2;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Material(
        type: MaterialType.transparency,
        child: Stack(
          children: [
            // Scrim with a rounded cutout + gold ring. Absorbs all taps so
            // the user can't trigger the spotlighted control mid-tour.
            Positioned.fill(
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () {}, // swallow
                child: CustomPaint(
                  painter: _ScrimPainter(
                    hole: hole,
                    radius: _step.holeRadius,
                  ),
                ),
              ),
            ),

            // The explainer card.
            AnimatedPositioned(
              duration: const Duration(milliseconds: 250),
              curve: Curves.easeOutCubic,
              left: 20,
              right: 20,
              top: cardBelow ? hole.bottom + 20 : null,
              bottom: cardBelow ? null : screen.height - hole.top + 20,
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 220),
                child: _TourCard(
                  key: ValueKey(_step.id),
                  step: _step,
                  stepNumber: _index + 1,
                  stepCount: widget.steps.length,
                  isLast: _isLast,
                  onNext: _next,
                  onSkip: _skip,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// =============================================================================
// Scrim painter — dim everything except a rounded hole around the target
// =============================================================================

class _ScrimPainter extends CustomPainter {
  final Rect hole;
  final double radius;
  const _ScrimPainter({required this.hole, required this.radius});

  @override
  void paint(Canvas canvas, Size size) {
    final rrect = RRect.fromRectAndRadius(
      hole,
      // Clamp so radiusFull on small circular buttons stays a circle.
      Radius.circular(radius.clamp(0, hole.shortestSide / 2)),
    );

    final scrim = Path.combine(
      PathOperation.difference,
      Path()..addRect(Offset.zero & size),
      Path()..addRRect(rrect),
    );
    canvas.drawPath(
      scrim,
      Paint()..color = Colors.black.withValues(alpha: 0.78),
    );
    // No ring here — the spotlighted widget itself renders its "activated"
    // look (gold icon / red heart / gold border) via activeTourStepProvider.
  }

  @override
  bool shouldRepaint(_ScrimPainter oldDelegate) =>
      oldDelegate.hole != hole || oldDelegate.radius != radius;
}

// =============================================================================
// Explainer card — gate-sheet visual language
// =============================================================================

class _TourCard extends StatelessWidget {
  final TourStep step;
  final int stepNumber;
  final int stepCount;
  final bool isLast;
  final VoidCallback onNext;
  final VoidCallback onSkip;

  const _TourCard({
    super.key,
    required this.step,
    required this.stepNumber,
    required this.stepCount,
    required this.isLast,
    required this.onNext,
    required this.onSkip,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(18, 18, 18, 14),
      decoration: BoxDecoration(
        color: RannaTheme.surface2,
        borderRadius: BorderRadius.circular(RannaTheme.radiusXl),
        border: Border.all(color: RannaTheme.border),
        boxShadow: RannaTheme.shadowFloat,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: RannaTheme.accent.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(RannaTheme.radiusMd),
                ),
                child: Icon(step.icon, size: 20, color: RannaTheme.accent),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  step.title,
                  style: const TextStyle(
                    fontFamily: RannaTheme.fontKufam,
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: RannaTheme.foreground,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            step.body,
            style: const TextStyle(
              fontFamily: RannaTheme.fontKufam,
              fontSize: 13,
              fontWeight: FontWeight.w300,
              height: 1.7,
              color: RannaTheme.mutedForeground,
            ),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: SizedBox(
                  height: 44,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: RannaTheme.tertiary,
                      foregroundColor: RannaTheme.tertiaryForeground,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(
                          RannaTheme.radiusFull,
                        ),
                      ),
                      elevation: 0,
                      padding: EdgeInsets.zero,
                    ),
                    onPressed: onNext,
                    child: Text(
                      isLast ? 'فهمت' : 'التالي',
                      style: const TextStyle(
                        fontFamily: RannaTheme.fontKufam,
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ),
              if (stepCount > 1) ...[
                const SizedBox(width: 12),
                Text(
                  '${toArabicNum(stepNumber)} / ${toArabicNum(stepCount)}',
                  style: const TextStyle(
                    fontFamily: RannaTheme.fontKufam,
                    fontSize: 12,
                    color: RannaTheme.mutedForeground,
                  ),
                ),
              ],
              const SizedBox(width: 12),
              TextButton(
                onPressed: onSkip,
                style: TextButton.styleFrom(
                  foregroundColor: RannaTheme.mutedForeground,
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                ),
                child: const Text(
                  'تخطّي',
                  style: TextStyle(
                    fontFamily: RannaTheme.fontKufam,
                    fontSize: 13,
                    fontWeight: FontWeight.w300,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
