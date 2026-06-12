import 'package:share_plus/share_plus.dart';

import 'package:ranna/services/mixpanel_service.dart';

const _baseUrl = 'https://ranna.aelsir.sd';

String getTrackShareUrl(String id) => '$_baseUrl/track/$id';

Future<void> shareTrack({
  required String trackId,
  required String title,
  String? artistName,
}) async {
  final url = getTrackShareUrl(trackId);
  final text = artistName != null ? '$title - $artistName' : title;
  await Share.share('$text\n$url');

  // ── Mixpanel: track_shared ──────────────────────────────────────────
  if (MixpanelService.isInitialized) {
    MixpanelService.instance.track('track_shared', properties: {
      'track_id': trackId,
      'track_title': title,
      'artist_name': artistName ?? '',
      'platform': MixpanelService.currentPlatform,
    });
  }
}
