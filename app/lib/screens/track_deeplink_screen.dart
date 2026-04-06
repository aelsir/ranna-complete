import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:ranna/models/madha.dart';
import 'package:ranna/services/audio_player_service.dart';
import 'package:ranna/theme/app_theme.dart';

/// Screen shown when navigating to /track/:id (from deep link or share).
///
/// Fetches the track from Supabase, caches it, starts playback,
/// opens the full player, then shows the home screen underneath.
class TrackDeepLinkScreen extends ConsumerStatefulWidget {
  final String trackId;
  const TrackDeepLinkScreen({super.key, required this.trackId});

  @override
  ConsumerState<TrackDeepLinkScreen> createState() => _TrackDeepLinkScreenState();
}

class _TrackDeepLinkScreenState extends ConsumerState<TrackDeepLinkScreen> {
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadAndPlay();
  }

  Future<void> _loadAndPlay() async {
    try {
      // Fetch track from Supabase
      final supabase = Supabase.instance.client;
      final result = await supabase
          .from('v_tracks')
          .select()
          .eq('id', widget.trackId)
          .maybeSingle();

      if (result == null) {
        setState(() {
          _loading = false;
          _error = 'لم يتم العثور على المدحة';
        });
        return;
      }

      final track = MadhaWithRelations.fromJson(result);

      // Cache the track for the player
      ref.read(trackCacheProvider.notifier).state = {
        ...ref.read(trackCacheProvider),
        track.id: track,
      };

      // Start playback and open full player
      ref.read(audioPlayerProvider.notifier).playTrack(track.id);
      ref.read(audioPlayerProvider.notifier).openFullPlayer();

      // Navigate to home (the full player overlay shows on top)
      if (mounted) {
        context.go('/');
      }
    } catch (e) {
      setState(() {
        _loading = false;
        _error = 'حدث خطأ في تحميل المدحة';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: RannaTheme.background,
        body: Center(
          child: _loading
              ? Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const CircularProgressIndicator(color: RannaTheme.accent),
                    const SizedBox(height: 16),
                    Text(
                      'جاري التحميل...',
                      style: TextStyle(
                        fontFamily: RannaTheme.fontFustat,
                        fontSize: 14,
                        color: RannaTheme.mutedForeground,
                      ),
                    ),
                  ],
                )
              : Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.error_outline_rounded,
                      size: 48,
                      color: RannaTheme.mutedForeground.withValues(alpha: 0.4),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      _error ?? 'حدث خطأ',
                      style: TextStyle(
                        fontFamily: RannaTheme.fontNotoNaskh,
                        fontSize: 16,
                        color: RannaTheme.mutedForeground,
                      ),
                    ),
                    const SizedBox(height: 24),
                    TextButton(
                      onPressed: () => context.go('/'),
                      child: Text(
                        'العودة للرئيسية',
                        style: TextStyle(
                          fontFamily: RannaTheme.fontFustat,
                          fontWeight: FontWeight.bold,
                          color: RannaTheme.accent,
                        ),
                      ),
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}
