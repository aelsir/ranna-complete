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
  Timer? _retryTimer;

  void setOffline() {
    _stopTimers();
    state = false;
  }

  void _stopTimers() {
    _debounce?.cancel();
    _retryTimer?.cancel();
  }

  /// Ping a reliable host to verify actual internet access.
  Future<void> checkReachability() async {
    _stopTimers();

    // Small delay to let the network settle after interface changes
    _debounce = Timer(const Duration(milliseconds: 500), () async {
      await _performCheck();
    });
  }

  Future<void> _performCheck() async {
    if (kIsWeb) {
      state = true; // Can't do socket lookup on web
      return;
    }

    try {
      // Try multiple reliable hosts in parallel
      final results = await Future.wait([
        InternetAddress.lookup('dns.google').timeout(const Duration(seconds: 2)),
        InternetAddress.lookup('one.one.one.one').timeout(const Duration(seconds: 2)),
      ]).catchError((_) => [<InternetAddress>[], <InternetAddress>[]]);

      final isActuallyOnline = results.any((list) => list.isNotEmpty && list.first.rawAddress.isNotEmpty);
      
      state = isActuallyOnline;

      // If we still think we are offline but the network interface is active,
      // schedule a retry to recover automatically.
      if (!isActuallyOnline) {
        _retryTimer?.cancel();
        _retryTimer = Timer(const Duration(seconds: 10), () => _performCheck());
      } else {
        _retryTimer?.cancel();
      }
    } catch (_) {
      state = false;
      _retryTimer?.cancel();
      _retryTimer = Timer(const Duration(seconds: 10), () => _performCheck());
    }
  }

  @override
  void dispose() {
    _stopTimers();
    super.dispose();
  }
}
