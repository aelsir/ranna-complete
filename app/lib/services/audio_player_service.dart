import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:just_audio/just_audio.dart' as ja;
import 'package:ranna/models/madha.dart';

// =====================================================
// R2 Public URL (from environment / compile-time define)
// =====================================================

const _r2PublicUrl = String.fromEnvironment(
  'R2_PUBLIC_URL',
  defaultValue: 'https://pub-5231206b23e34ae59ce4f085c70f77be.r2.dev',
);

// =====================================================
// PlayerState - Immutable state for the audio player
// =====================================================

class PlayerState {
  final String? currentTrackId;
  final List<String> queue;
  final int currentIndex;
  final bool isPlaying;
  final Duration position;
  final Duration duration;
  final bool isFullPlayerOpen;

  const PlayerState({
    this.currentTrackId,
    this.queue = const [],
    this.currentIndex = 0,
    this.isPlaying = false,
    this.position = Duration.zero,
    this.duration = Duration.zero,
    this.isFullPlayerOpen = false,
  });

  PlayerState copyWith({
    String? currentTrackId,
    List<String>? queue,
    int? currentIndex,
    bool? isPlaying,
    Duration? position,
    Duration? duration,
    bool? isFullPlayerOpen,
  }) {
    return PlayerState(
      currentTrackId: currentTrackId ?? this.currentTrackId,
      queue: queue ?? this.queue,
      currentIndex: currentIndex ?? this.currentIndex,
      isPlaying: isPlaying ?? this.isPlaying,
      position: position ?? this.position,
      duration: duration ?? this.duration,
      isFullPlayerOpen: isFullPlayerOpen ?? this.isFullPlayerOpen,
    );
  }

  /// Whether a track is loaded and ready (or playing).
  bool get hasTrack => currentTrackId != null;

  /// Whether there is a next track in the queue.
  bool get hasNext => queue.isNotEmpty && currentIndex < queue.length - 1;

  /// Whether there is a previous track in the queue.
  bool get hasPrevious => queue.isNotEmpty && currentIndex > 0;

  /// Progress as a value between 0.0 and 1.0.
  double get progress {
    if (duration.inMilliseconds == 0) return 0.0;
    return (position.inMilliseconds / duration.inMilliseconds).clamp(0.0, 1.0);
  }
}

// =====================================================
// Track cache provider
// Screens that load madha data should populate this cache
// so the audio player can resolve track IDs to audio URLs.
// =====================================================

final trackCacheProvider =
    StateProvider<Map<String, MadhaWithRelations>>((ref) => {});

// =====================================================
// AudioPlayerService - Core player as a StateNotifier
// =====================================================

class AudioPlayerService extends StateNotifier<PlayerState> {
  final ja.AudioPlayer _player = ja.AudioPlayer();
  final Ref _ref;

  StreamSubscription<Duration>? _positionSub;
  StreamSubscription<Duration?>? _durationSub;
  StreamSubscription<ja.PlayerState>? _playerStateSub;
  DateTime? _lastPositionUpdate;
  StreamSubscription<ja.ProcessingState>? _processingStateSub;

  AudioPlayerService(this._ref) : super(const PlayerState()) {
    _listenToPlayerStreams();
  }

  /// The underlying just_audio player, exposed for advanced use cases.
  ja.AudioPlayer get player => _player;

  // ---------------------------------------------------
  // Stream listeners
  // ---------------------------------------------------

  void _listenToPlayerStreams() {
    _positionSub = _player.positionStream.listen((pos) {
      if (!mounted) return;
      final now = DateTime.now();
      if (_lastPositionUpdate == null ||
          now.difference(_lastPositionUpdate!) > const Duration(milliseconds: 250)) {
        _lastPositionUpdate = now;
        state = state.copyWith(position: pos);
      }
    });

    _durationSub = _player.durationStream.listen((dur) {
      if (mounted && dur != null) {
        state = state.copyWith(duration: dur);
      }
    });

    _playerStateSub = _player.playerStateStream.listen((playerState) {
      if (mounted) {
        state = state.copyWith(isPlaying: playerState.playing);
      }
    });

    _processingStateSub =
        _player.processingStateStream.listen((processingState) {
      if (mounted && processingState == ja.ProcessingState.completed) {
        _onTrackCompleted();
      }
    });
  }

  /// Called when the current track finishes playing.
  /// Auto-advances to the next track in the queue.
  void _onTrackCompleted() {
    if (state.hasNext) {
      playNext();
    } else {
      // End of queue - reset position and stop playing
      state = state.copyWith(
        isPlaying: false,
        position: Duration.zero,
      );
    }
  }

  // ---------------------------------------------------
  // Resolve track ID to a playable audio URL
  // ---------------------------------------------------

  String? _resolveAudioUrl(String trackId) {
    final cache = _ref.read(trackCacheProvider);
    final track = cache[trackId];
    if (track == null || track.audioUrl == null) return null;

    final audioPath = track.audioUrl!;

    // If the URL is already absolute, use it directly
    if (audioPath.startsWith('http://') || audioPath.startsWith('https://')) {
      return audioPath;
    }

    // Otherwise, build the full URL using the R2 public base URL
    // Remove leading slash if present to avoid double slashes
    final cleanPath =
        audioPath.startsWith('/') ? audioPath.substring(1) : audioPath;
    return '$_r2PublicUrl/$cleanPath';
  }

  /// Get the cached track data for a given track ID.
  MadhaWithRelations? _getCachedTrack(String trackId) {
    return _ref.read(trackCacheProvider)[trackId];
  }

  // ---------------------------------------------------
  // Playback controls
  // ---------------------------------------------------

  /// Play a specific track by ID.
  ///
  /// Optionally provide a [queue] of track IDs. If provided, the player will
  /// set up the full queue and position the current index at [trackId].
  ///
  /// If [queue] is not provided, a single-item queue is created.
  Future<void> playTrack(String trackId, {List<String>? queue}) async {
    final trackQueue = queue ?? [trackId];
    final index = trackQueue.indexOf(trackId);
    final effectiveIndex = index >= 0 ? index : 0;

    state = state.copyWith(
      currentTrackId: trackId,
      queue: trackQueue,
      currentIndex: effectiveIndex,
      position: Duration.zero,
      duration: Duration.zero,
    );

    await _loadAndPlay(trackId);
  }

  /// Load a track's audio URL into the player and start playback.
  Future<void> _loadAndPlay(String trackId) async {
    final url = _resolveAudioUrl(trackId);
    if (url == null) {
      // No audio URL available - cannot play
      state = state.copyWith(isPlaying: false);
      return;
    }

    try {
      // Set up MediaItem tag with track metadata for potential lock screen display
      final track = _getCachedTrack(trackId);
      final tag = MediaItem(
        id: trackId,
        title: track?.title ?? 'Unknown',
        artist: track?.madih ?? track?.madihDetails?.name,
        artUri: _resolveArtworkUri(track),
      );

      await _player.setAudioSource(
        ja.AudioSource.uri(
          Uri.parse(url),
          tag: tag,
        ),
      );
      await _player.play();
    } catch (e) {
      // Log the error but don't crash. The UI can show an error state
      // based on isPlaying being false with a currentTrackId set.
      state = state.copyWith(isPlaying: false);
    }
  }

  /// Resolve artwork URL for a track.
  Uri? _resolveArtworkUri(MadhaWithRelations? track) {
    if (track == null) return null;

    // Prefer track image, fall back to artist image
    final imagePath = track.imageUrl ?? track.madihDetails?.imageUrl;
    if (imagePath == null) return null;

    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return Uri.tryParse(imagePath);
    }

    final cleanPath =
        imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
    return Uri.tryParse('$_r2PublicUrl/$cleanPath');
  }

  /// Toggle play/pause for the current track.
  Future<void> togglePlay() async {
    if (_player.playing) {
      await _player.pause();
    } else {
      await _player.play();
    }
  }

  /// Pause playback.
  Future<void> pause() async {
    await _player.pause();
  }

  /// Resume playback.
  Future<void> resume() async {
    await _player.play();
  }

  /// Seek to a specific position.
  Future<void> seekTo(Duration position) async {
    await _player.seek(position);
  }

  /// Skip forward by 15 seconds.
  Future<void> skipForward() async {
    final newPos = _player.position + const Duration(seconds: 15);
    final maxPos = _player.duration ?? Duration.zero;
    await _player.seek(newPos > maxPos ? maxPos : newPos);
  }

  /// Skip backward by 15 seconds.
  Future<void> skipBackward() async {
    final newPos = _player.position - const Duration(seconds: 15);
    await _player.seek(newPos < Duration.zero ? Duration.zero : newPos);
  }

  /// Play the next track in the queue.
  Future<void> playNext() async {
    if (!state.hasNext) return;

    final nextIndex = state.currentIndex + 1;
    final nextTrackId = state.queue[nextIndex];

    state = state.copyWith(
      currentTrackId: nextTrackId,
      currentIndex: nextIndex,
      position: Duration.zero,
      duration: Duration.zero,
    );

    await _loadAndPlay(nextTrackId);
  }

  /// Play the previous track in the queue.
  ///
  /// If the current position is more than 3 seconds in, restart the current
  /// track instead of going to the previous one.
  Future<void> playPrevious() async {
    // If we're more than 3 seconds into the track, restart it
    if (_player.position > const Duration(seconds: 3)) {
      await _player.seek(Duration.zero);
      return;
    }

    if (!state.hasPrevious) {
      await _player.seek(Duration.zero);
      return;
    }

    final prevIndex = state.currentIndex - 1;
    final prevTrackId = state.queue[prevIndex];

    state = state.copyWith(
      currentTrackId: prevTrackId,
      currentIndex: prevIndex,
      position: Duration.zero,
      duration: Duration.zero,
    );

    await _loadAndPlay(prevTrackId);
  }

  // ---------------------------------------------------
  // Full player view toggle
  // ---------------------------------------------------

  /// Toggle the full player view open/closed.
  void toggleFullPlayer() {
    state = state.copyWith(isFullPlayerOpen: !state.isFullPlayerOpen);
  }

  /// Open the full player view.
  void openFullPlayer() {
    state = state.copyWith(isFullPlayerOpen: true);
  }

  /// Close the full player view.
  void closeFullPlayer() {
    state = state.copyWith(isFullPlayerOpen: false);
  }

  // ---------------------------------------------------
  // Cleanup
  // ---------------------------------------------------

  @override
  void dispose() {
    _positionSub?.cancel();
    _durationSub?.cancel();
    _playerStateSub?.cancel();
    _processingStateSub?.cancel();
    _player.dispose();
    super.dispose();
  }
}

// =====================================================
// just_audio MediaItem tag (lightweight metadata holder)
// =====================================================

/// A simple metadata tag attached to each AudioSource so that
/// lock screen / notification controls can display track info.
class MediaItem {
  final String id;
  final String title;
  final String? artist;
  final Uri? artUri;

  const MediaItem({
    required this.id,
    required this.title,
    this.artist,
    this.artUri,
  });
}

// =====================================================
// Provider
// =====================================================

final audioPlayerProvider =
    StateNotifierProvider<AudioPlayerService, PlayerState>((ref) {
  return AudioPlayerService(ref);
});

// =====================================================
// Convenience selector providers
// =====================================================

/// The currently playing track's cached data (if available).
final currentTrackProvider = Provider<MadhaWithRelations?>((ref) {
  final playerState = ref.watch(audioPlayerProvider);
  if (playerState.currentTrackId == null) return null;
  final cache = ref.watch(trackCacheProvider);
  return cache[playerState.currentTrackId];
});

/// Whether the player is currently playing.
final isPlayingProvider = Provider<bool>((ref) {
  return ref.watch(audioPlayerProvider.select((s) => s.isPlaying));
});

/// Whether the full player view is open.
final isFullPlayerOpenProvider = Provider<bool>((ref) {
  return ref.watch(audioPlayerProvider.select((s) => s.isFullPlayerOpen));
});
