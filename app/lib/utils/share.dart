import 'package:share_plus/share_plus.dart';

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
}
