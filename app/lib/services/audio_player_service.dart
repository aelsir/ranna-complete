import 'dart:async';

import 'package:audio_service/audio_service.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:just_audio/just_audio.dart' as ja;
import 'package:ranna/models/madha.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

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

  bool get hasTrack => currentTrackId != null;
  bool get hasNext => queue.isNotEmpty && currentIndex < queue.length - 1;
  bool get hasPrevious => queue.isNotEmpty && currentIndex > 0;

  double get progress {
    if (duration.inMilliseconds == 0) return 0.0;
    return (position.inMilliseconds / duration.inMilliseconds).clamp(0.0, 1.0);
  }
}

// =====================================================
// Track cache provider
// =====================================================

final trackCacheProvider =
    StateProvider<Map<String, MadhaWithRelations>>((ref) => {});

// =====================================================
// RannaAudioHandler — bridges just_audio with native controls
// =====================================================

class RannaAudioHandler extends BaseAudioHandler with SeekHandler {
  final ja.AudioPlayer _player = ja.AudioPlayer();

  ja.AudioPlayer get player => _player;

  /// Set by AudioPlayerService to handle skip from native controls.
  void Function()? onSkipToNext;
  void Function()? onSkipToPrevious;

  RannaAudioHandler() {
    // Broadcast playback state to native controls
    _player.playbackEventStream.map(_transformEvent).pipe(playbackState);
  }

  PlaybackState _transformEvent(ja.PlaybackEvent event) {
    return PlaybackState(
      controls: [
        MediaControl.skipToPrevious,
        if (_player.playing) MediaControl.pause else MediaControl.play,
        MediaControl.skipToNext,
      ],
      systemActions: const {
        MediaAction.seek,
        MediaAction.seekForward,
        MediaAction.seekBackward,
      },
      androidCompactActionIndices: const [0, 1, 2],
      processingState: const {
        ja.ProcessingState.idle: AudioProcessingState.idle,
        ja.ProcessingState.loading: AudioProcessingState.loading,
        ja.ProcessingState.buffering: AudioProcessingState.buffering,
        ja.ProcessingState.ready: AudioProcessingState.ready,
        ja.ProcessingState.completed: AudioProcessingState.completed,
      }[_player.processingState]!,
      playing: _player.playing,
      updatePosition: _player.position,
      bufferedPosition: _player.bufferedPosition,
      speed: _player.speed,
      queueIndex: event.currentIndex,
    );
  }

  @override
  Future<void> play() => _player.play();

  @override
  Future<void> pause() => _player.pause();

  @override
  Future<void> seek(Duration position) => _player.seek(position);

  @override
  Future<void> skipToNext() async {
    onSkipToNext?.call();
  }

  @override
  Future<void> skipToPrevious() async {
    onSkipToPrevious?.call();
  }

  @override
  Future<void> stop() async {
    await _player.stop();
    return super.stop();
  }

  Future<void> dispose() async {
    await _player.dispose();
  }
}

/// Initialize the audio handler. Call once in main().
Future<RannaAudioHandler> initAudioHandler() async {
  return await AudioService.init(
    builder: () => RannaAudioHandler(),
    config: const AudioServiceConfig(
      androidNotificationChannelId: 'com.ranna.audio',
      androidNotificationChannelName: 'رنّة للمدائح',
      androidNotificationOngoing: true,
      androidStopForegroundOnPause: true,
    ),
  );
}

/// Global reference set by main().
late final RannaAudioHandler audioHandler;

// =====================================================
// AudioPlayerService - Core player as a StateNotifier
// =====================================================

class AudioPlayerService extends StateNotifier<PlayerState> {
  final ja.AudioPlayer _player;
  final Ref _ref;

  StreamSubscription<Duration>? _positionSub;
  StreamSubscription<Duration?>? _durationSub;
  StreamSubscription<ja.PlayerState>? _playerStateSub;
  DateTime? _lastPositionUpdate;
  StreamSubscription<ja.ProcessingState>? _processingStateSub;

  AudioPlayerService(this._ref)
      : _player = audioHandler.player,
        super(const PlayerState()) {
    _listenToPlayerStreams();
    // Wire native lock screen skip controls to our queue logic
    audioHandler.onSkipToNext = () => playNext();
    audioHandler.onSkipToPrevious = () => playPrevious();
  }

  ja.AudioPlayer get player => _player;

  // ---------------------------------------------------
  // Stream listeners
  // ---------------------------------------------------

  void _listenToPlayerStreams() {
    _positionSub = _player.positionStream.listen((pos) {
      if (!mounted) return;
      final now = DateTime.now();
      if (_lastPositionUpdate == null ||
          now.difference(_lastPositionUpdate!) >
              const Duration(milliseconds: 250)) {
        _lastPositionUpdate = now;
        state = state.copyWith(position: pos);
      }
    });

    _durationSub = _player.durationStream.listen((dur) {
      if (mounted && dur != null) {
        state = state.copyWith(duration: dur);
        // Update native media controls with actual duration
        final current = audioHandler.mediaItem.value;
        if (current != null && current.duration != dur) {
          audioHandler.mediaItem.add(current.copyWith(duration: dur));
        }
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

  void _onTrackCompleted() {
    if (state.hasNext) {
      playNext();
    } else {
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
    if (audioPath.startsWith('http://') || audioPath.startsWith('https://')) {
      return audioPath;
    }

    final cleanPath =
        audioPath.startsWith('/') ? audioPath.substring(1) : audioPath;
    return '$_r2PublicUrl/$cleanPath';
  }

  MadhaWithRelations? _getCachedTrack(String trackId) {
    return _ref.read(trackCacheProvider)[trackId];
  }

  // ---------------------------------------------------
  // Playback controls
  // ---------------------------------------------------

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

  Future<void> _loadAndPlay(String trackId) async {
    final url = _resolveAudioUrl(trackId);
    if (url == null) {
      state = state.copyWith(isPlaying: false);
      return;
    }

    try {
      final track = _getCachedTrack(trackId);

      // Update native media controls with track metadata
      final artUri = _resolveArtworkUri(track);
      audioHandler.mediaItem.add(MediaItem(
        id: trackId,
        title: track?.title ?? 'Unknown',
        artist: track?.madihDetails?.name ?? track?.madih,
        artUri: artUri,
        duration: track?.durationSeconds != null
            ? Duration(seconds: track!.durationSeconds!)
            : null,
      ));

      await _player.setAudioSource(
        ja.AudioSource.uri(Uri.parse(url)),
      );
      await _player.play();

      // Log play event for trending analytics (fire-and-forget)
      _logPlayEvent(trackId);
    } catch (e) {
      state = state.copyWith(isPlaying: false);
    }
  }

  /// Logs a play event to Supabase for trending calculations.
  void _logPlayEvent(String trackId) {
    try {
      final supabase = Supabase.instance.client;
      final userId = supabase.auth.currentUser?.id;
      final data = <String, dynamic>{'madha_id': trackId};
      if (userId != null) data['user_id'] = userId;
      supabase.from('play_events').insert(data).then((_) {}).catchError((_) {});
    } catch (_) {
      // Non-critical — don't interrupt playback
    }
  }

  /// Resolve artwork URL for a track.
  /// Fallback chain: track image > madih image > rawi image > null
  /// (null falls back to ranna logo in the UI layer)
  Uri? _resolveArtworkUri(MadhaWithRelations? track) {
    if (track == null) return null;

    final imagePath = track.imageUrl ??
        track.madihDetails?.imageUrl ??
        track.rawi?.imageUrl;
    if (imagePath == null) return null;

    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return Uri.tryParse(imagePath);
    }

    final cleanPath =
        imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
    return Uri.tryParse('$_r2PublicUrl/$cleanPath');
  }

  Future<void> togglePlay() async {
    if (_player.playing) {
      await _player.pause();
    } else {
      await _player.play();
    }
  }

  Future<void> pause() async {
    await _player.pause();
  }

  Future<void> resume() async {
    await _player.play();
  }

  Future<void> seekTo(Duration position) async {
    await _player.seek(position);
  }

  Future<void> skipForward() async {
    final newPos = _player.position + const Duration(seconds: 15);
    final maxPos = _player.duration ?? Duration.zero;
    await _player.seek(newPos > maxPos ? maxPos : newPos);
  }

  Future<void> skipBackward() async {
    final newPos = _player.position - const Duration(seconds: 15);
    await _player.seek(newPos < Duration.zero ? Duration.zero : newPos);
  }

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

  Future<void> playPrevious() async {
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

  void toggleFullPlayer() {
    state = state.copyWith(isFullPlayerOpen: !state.isFullPlayerOpen);
  }

  void openFullPlayer() {
    state = state.copyWith(isFullPlayerOpen: true);
  }

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
    super.dispose();
  }
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

final currentTrackProvider = Provider<MadhaWithRelations?>((ref) {
  final playerState = ref.watch(audioPlayerProvider);
  if (playerState.currentTrackId == null) return null;
  final cache = ref.watch(trackCacheProvider);
  return cache[playerState.currentTrackId];
});

final isPlayingProvider = Provider<bool>((ref) {
  return ref.watch(audioPlayerProvider.select((s) => s.isPlaying));
});

final isFullPlayerOpenProvider = Provider<bool>((ref) {
  return ref.watch(audioPlayerProvider.select((s) => s.isFullPlayerOpen));
});
