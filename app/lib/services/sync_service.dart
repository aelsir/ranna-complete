import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../db/local_db.dart';

/// Drains the pending_actions queue to Supabase when online.
///
/// Called automatically when the app transitions from offline → online,
/// and can also be triggered manually.
class SyncService {
  static bool _isSyncing = false;

  /// Process all queued actions. Safe to call multiple times —
  /// concurrent calls are ignored via the [_isSyncing] lock.
  static Future<void> syncPendingActions() async {
    if (_isSyncing) return;
    _isSyncing = true;

    try {
      final actions = await LocalDb.getPendingActions();
      if (actions.isEmpty) {
        debugPrint('✅ SyncService: no pending actions');
        return;
      }

      debugPrint('🔄 SyncService: syncing ${actions.length} queued actions...');
      final supabase = Supabase.instance.client;
      int synced = 0;

      for (final action in actions) {
        try {
          final payload = action.payloadMap;

          switch (action.actionType) {
            case 'favorite':
              await supabase.from('user_favorites').insert(payload);

            case 'unfavorite':
              await supabase
                  .from('user_favorites')
                  .delete()
                  .eq('user_id', payload['user_id'] as String)
                  .eq('track_id', payload['track_id'] as String);

            case 'play_event':
              await supabase.from('play_events').insert(payload);

            case 'increment_play_count':
              await supabase.rpc('increment_play_count', params: payload);

            case 'listening_history':
              await supabase.from('listening_history').upsert(
                payload,
                onConflict: 'user_id,track_id',
              );

            default:
              debugPrint('⚠️ SyncService: unknown action type: ${action.actionType}');
          }

          await LocalDb.deletePendingAction(action.id);
          synced++;
        } catch (e) {
          // Keep this action and all subsequent ones in the queue
          // to maintain chronological order
          debugPrint('⚠️ SyncService: failed on ${action.actionType}: $e');
          break;
        }
      }

      debugPrint('✅ SyncService: synced $synced/${actions.length} actions');
    } finally {
      _isSyncing = false;
    }
  }
}
