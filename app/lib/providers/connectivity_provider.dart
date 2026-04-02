import 'dart:async';
import 'dart:io';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Raw connectivity stream from the OS.
final connectivityProvider = StreamProvider<List<ConnectivityResult>>((ref) {
  return Connectivity().onConnectivityChanged;
});

/// Actual internet reachability — checks both network interface AND
/// real connectivity by pinging a reliable host.
///
/// `connectivity_plus` only checks if Wi-Fi/mobile is on, NOT if there's
/// actual internet access. This provider adds a real ping check.
final isOnlineProvider = StateNotifierProvider<_OnlineNotifier, bool>((ref) {
  final notifier = _OnlineNotifier();
  // Re-check whenever the OS reports a connectivity change
  ref.listen<AsyncValue<List<ConnectivityResult>>>(connectivityProvider, (_, next) {
    next.whenData((results) {
      if (results.contains(ConnectivityResult.none)) {
        notifier.setOffline();
      } else {
        notifier.checkReachability();
      }
    });
  });
  // Initial check
  notifier.checkReachability();
  return notifier;
});

class _OnlineNotifier extends StateNotifier<bool> {
  _OnlineNotifier() : super(true); // Assume online initially

  Timer? _debounce;

  void setOffline() {
    _debounce?.cancel();
    state = false;
  }

  /// Ping a reliable host to verify actual internet access.
  Future<void> checkReachability() async {
    _debounce?.cancel();
    // Small delay to let the network settle after interface changes
    _debounce = Timer(const Duration(milliseconds: 500), () async {
      if (kIsWeb) {
        state = true; // Can't do socket lookup on web
        return;
      }
      try {
        final result = await InternetAddress.lookup('dns.google')
            .timeout(const Duration(seconds: 3));
        state = result.isNotEmpty && result.first.rawAddress.isNotEmpty;
      } catch (_) {
        state = false;
      }
    });
  }

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }
}
