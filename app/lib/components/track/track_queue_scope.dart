import 'package:flutter/widgets.dart';

import 'package:ranna/models/madha.dart';

/// Provides the current "list of tracks the user is browsing" to every
/// [TrackRow] in its subtree, so each row plays *as part of that list* and
/// auto-advances to the next track when the current one finishes.
///
/// Usage — wrap each list's body once:
///
/// ```dart
/// TrackQueueScope(
///   tracks: tracks,
///   child: ListView.builder(
///     itemBuilder: (_, i) => TrackRow(track: tracks[i], index: i),
///   ),
/// )
/// ```
///
/// `TrackRow` reads from this scope automatically when its `queue` parameter
/// is null. Lists no longer have to thread the queue through every row —
/// **wrapping is the API**. Without a scope, taps on a [TrackRow] play
/// only that one track (single-track context, useful for deeplink screens).
///
/// The "streamline" of the original design: instead of every list parent
/// remembering `queue: tracks` per item (an opt-in pattern that rotted —
/// favorites' downloads section, web's RecentlyAdded / TrendingTracks /
/// ContinueListening, etc. all forgot), the queue is established once at
/// the list level and inherited by every child row.
class TrackQueueScope extends InheritedWidget {
  /// The ordered tracks the user is currently browsing. Auto-advance plays
  /// them in this order; `tracks[0]` plays first, `tracks.last` plays last.
  final List<MadhaWithRelations> tracks;

  const TrackQueueScope({
    super.key,
    required this.tracks,
    required super.child,
  });

  /// Returns the nearest enclosing [TrackQueueScope], or `null` if none.
  /// Returning `null` (instead of throwing) is deliberate — a `TrackRow`
  /// outside any scope still works, it just plays as a single-track queue.
  static TrackQueueScope? of(BuildContext context) {
    return context.dependOnInheritedWidgetOfExactType<TrackQueueScope>();
  }

  @override
  bool updateShouldNotify(TrackQueueScope oldWidget) {
    // Identity-compare the list reference — every list builder rebuilds
    // with a fresh List instance when the underlying tracks change, so
    // `!identical` correctly detects "queue changed". A deep-equality
    // comparison would be wasteful at typical list sizes (tens of items)
    // and semantically wrong if a list mutated in place (we want to react).
    return !identical(tracks, oldWidget.tracks);
  }
}
