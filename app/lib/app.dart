import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ranna/providers/connectivity_provider.dart';
import 'package:ranna/services/sync_service.dart';
import 'package:ranna/theme/app_theme.dart';
import 'package:ranna/utils/responsive.dart';
import 'package:ranna/screens/home_screen.dart';
import 'package:ranna/screens/search_screen.dart';
import 'package:ranna/screens/favorites_screen.dart';
import 'package:ranna/screens/account_screen.dart';
import 'package:ranna/screens/edit_profile_screen.dart';
import 'package:ranna/screens/listening_history_screen.dart';
import 'package:ranna/screens/listening_stats_screen.dart';
import 'package:ranna/screens/my_follows_screen.dart';
import 'package:ranna/screens/browse_screen.dart';
import 'package:ranna/screens/profile_screen.dart';
import 'package:ranna/screens/playlist_screen.dart';
import 'package:ranna/screens/all_artists_screen.dart';
import 'package:ranna/screens/all_narrators_screen.dart';
import 'package:ranna/screens/all_tariqas_screen.dart';
import 'package:ranna/screens/all_funoon_screen.dart';
import 'package:ranna/screens/track_deeplink_screen.dart';
import 'package:ranna/screens/auth_screen.dart';
import 'package:ranna/screens/auth_callback_screen.dart';
import 'package:ranna/providers/auth_notifier.dart';
import 'package:ranna/components/player/mini_player.dart';
import 'package:ranna/components/player/full_player.dart';
import 'package:ranna/services/audio_player_service.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>();

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/',
    // Deep-link scheme rewrite: Supabase magic-link emails redirect to
    // `sd.aelsir.ranna://auth/callback?code=...`. GoRouter receives the raw
    // URL including the scheme, which doesn't match any registered route.
    // Strip scheme+host and keep path+query so it resolves to `/auth/callback`.
    redirect: (context, state) {
      final uriStr = state.uri.toString();
      if (uriStr.startsWith('sd.aelsir.ranna://')) {
        final uri = Uri.parse(uriStr);
        final path = uri.path.isEmpty ? '' : uri.path;
        final host = uri.host;
        final query = uri.hasQuery ? '?${uri.query}' : '';
        return '/$host$path$query';
      }
      return null;
    },
    routes: [
      // Top-level routes OUTSIDE the shell (no bottom nav).
      // Used for auth flows so the sign-in screen fills the viewport.
      GoRoute(
        path: '/auth',
        builder: (context, state) {
          final extra = state.extra;
          final initialEmail = extra is Map<String, dynamic>
              ? extra['initialEmail'] as String?
              : null;
          return AuthScreen(initialEmail: initialEmail);
        },
      ),
      GoRoute(
        path: '/auth/callback',
        builder: (context, state) => const AuthCallbackScreen(),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) =>
            ShellScaffold(navigationShell: navigationShell),
        branches: [
          // Tab 0: Home (and sub-pages that share the shell)
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/',
              builder: (context, state) => const HomeScreen(),
              routes: [
                GoRoute(path: 'browse', builder: (context, state) => const BrowseScreen()),
                GoRoute(
                  path: 'profile/:type/:id',
                  builder: (context, state) => ProfileScreen(
                    type: state.pathParameters['type']!,
                    id: state.pathParameters['id']!,
                  ),
                ),
                GoRoute(
                  path: 'playlist/:id',
                  builder: (context, state) => PlaylistScreen(id: state.pathParameters['id']!),
                ),
                GoRoute(path: 'artists', builder: (context, state) => const AllArtistsScreen()),
                GoRoute(path: 'narrators', builder: (context, state) => const AllNarratorsScreen()),
                GoRoute(path: 'tariqas', builder: (context, state) => const AllTariqasScreen()),
                GoRoute(path: 'funoon', builder: (context, state) => const AllFunoonScreen()),
                GoRoute(
                  path: 'track/:id',
                  builder: (context, state) => TrackDeepLinkScreen(trackId: state.pathParameters['id']!),
                ),
              ],
            ),
          ]),
          // Tab 1: Search
          StatefulShellBranch(routes: [
            GoRoute(path: '/search', builder: (context, state) => const SearchScreen()),
          ]),
          // Tab 2: Favorites
          StatefulShellBranch(routes: [
            GoRoute(path: '/favorites', builder: (context, state) => const FavoritesScreen()),
          ]),
          // Tab 3: Account (زاويتي)
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/account',
              builder: (context, state) => const AccountScreen(),
              routes: [
                GoRoute(
                  path: 'edit',
                  builder: (context, state) => const EditProfileScreen(),
                ),
                GoRoute(
                  path: 'listening-history',
                  builder: (context, state) => const ListeningHistoryScreen(),
                ),
                GoRoute(
                  path: 'listening-stats',
                  builder: (context, state) => const ListeningStatsScreen(),
                ),
                GoRoute(
                  path: 'my-follows',
                  builder: (context, state) => const MyFollowsScreen(),
                ),
              ],
            ),
          ]),
        ],
      ),
    ],
  );
});

class RannaApp extends ConsumerWidget {
  const RannaApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    return MaterialApp.router(
      title: 'رنّة للمدائح',
      debugShowCheckedModeBanner: false,
      routerConfig: router,
      theme: RannaTheme.lightTheme,
      locale: const Locale('ar'),
      builder: (context, child) {
        return Directionality(
          textDirection: TextDirection.rtl,
          child: child ?? const SizedBox.shrink(),
        );
      },
    );
  }
}

/// Shell scaffold with content area, floating mini player, and floating bottom nav.
class ShellScaffold extends ConsumerWidget {
  final StatefulNavigationShell navigationShell;
  const ShellScaffold({super.key, required this.navigationShell});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isFullPlayerOpen = ref.watch(isFullPlayerOpenProvider);
    final hasTrack = ref.watch(currentTrackProvider) != null;
    final isOnline = ref.watch(isOnlineProvider);
    final padding = MediaQuery.of(context).padding;
    final topPadding = padding.top;
    final bottomPadding = padding.bottom;

    // Auto-sync queued actions when coming back online
    ref.listen<bool>(isOnlineProvider, (prev, next) {
      if (prev == false && next == true) {
        SyncService.syncPendingActions();
      }
    });

    // Auto-sync queued actions when the user identity changes (anon bootstrap
    // completes, or anon → email upgrade). Any favorites/plays that were
    // queued under the previous user_id flush under the new identity.
    ref.listen<AuthState>(authNotifierProvider, (prev, next) {
      final prevId = prev?.user?.id;
      final nextId = next.user?.id;
      if (nextId != null && nextId != prevId) {
        SyncService.syncPendingActions();
      }
    });

    // Bottom nav height + spacing
    const navBarHeight = 68.0;
    const navBarBottomMargin = 2.0;
    // Mini player height
    const miniPlayerHeight = 72.0;



    // Offline banner height (animated)
    const bannerHeight = 28.0;
    final showBanner = !isOnline;
    final contentTop = topPadding + (showBanner ? bannerHeight : 0);

    // iPad: no shell margins, content constrained to phone width inside
    final tablet = isTablet(context);

    return Scaffold(
      backgroundColor: RannaTheme.background,
      body: Stack(
        children: [
          // ===== Content Area =====
          AnimatedPositioned(
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeInOut,
            top: contentTop,
            left: 0,
            right: 0,
            bottom: 0,
            child: Center(
              child: ConstrainedBox(
                constraints: BoxConstraints(maxWidth: contentMaxWidth(context)),
                child: MediaQuery.removePadding(
                  context: context,
                  removeTop: true,
                  child: navigationShell,
                ),
              ),
            ),
          ),

          // ===== Offline Banner (above everything) =====
          AnimatedPositioned(
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeInOut,
            top: showBanner ? 0 : -(topPadding + bannerHeight),
            left: 0,
            right: 0,
            height: topPadding + bannerHeight,
            child: Container(
              color: const Color(0xFFF97316), // Orange
              alignment: Alignment.bottomCenter,
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.wifi_off_rounded,
                    size: 13,
                    color: Colors.white,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'أنت غير متصل — يتم عرض البيانات المحفوظة',
                    style: TextStyle(
                      fontFamily: RannaTheme.fontFustat,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
            ),
          ),

          // ===== Mini Player =====
          if (hasTrack && MediaQuery.of(context).viewInsets.bottom == 0)
            Positioned(
              left: 4,
              right: 4,
              bottom: navBarHeight + navBarBottomMargin + bottomPadding + 4,
              child: Center(
                child: ConstrainedBox(
                  constraints: BoxConstraints(maxWidth: contentMaxWidth(context)),
                  child: const MiniPlayer(),
                ),
              ),
            ),

          // ===== Bottom Navigation =====
          if (MediaQuery.of(context).viewInsets.bottom == 0)
            Positioned(
              left: 4,
              right: 4,
              bottom: navBarBottomMargin + bottomPadding,
              child: Center(
                child: ConstrainedBox(
                  constraints: BoxConstraints(maxWidth: contentMaxWidth(context)),
                  child: _FloatingBottomNav(navigationShell: navigationShell),
                ),
              ),
            ),

          // ===== Full Player Overlay =====
          if (isFullPlayerOpen)
            Positioned(
              left: 0,
              right: 0,
              top: contentTop,
              bottom: navBarHeight + navBarBottomMargin + bottomPadding + 4,
              child: Center(
                child: ConstrainedBox(
                  constraints: BoxConstraints(maxWidth: contentMaxWidth(context)),
                  child: MediaQuery.removePadding(
                    context: context,
                    removeTop: true,
                    child: const FullPlayer(),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// =============================================================================
// Floating Bottom Navigation Bar
// =============================================================================

class _FloatingBottomNav extends ConsumerWidget {
  final StatefulNavigationShell navigationShell;
  const _FloatingBottomNav({required this.navigationShell});

  static const _tabs = [
    _TabData(icon: Icons.home_outlined, activeIcon: Icons.home_rounded, label: 'السَّاحة'),
    _TabData(icon: Icons.search_outlined, activeIcon: Icons.search_rounded, label: 'فتّش'),
    _TabData(icon: Icons.favorite_outline_rounded, activeIcon: Icons.favorite_rounded, label: 'مُختاراتي'),
    _TabData(icon: Icons.person_outline_rounded, activeIcon: Icons.person_rounded, label: 'زاويتي'),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentIndex = navigationShell.currentIndex;

    // ClipRRect + BackdropFilter give the nav a frosted-dark feel: anything
    // scrolling underneath blurs through the bar instead of disappearing
    // behind a flat surface. The elevated card color sits on top at 90%
    // alpha so the blur reads through.
    return ClipRRect(
      borderRadius: BorderRadius.circular(RannaTheme.radiusXl),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
        child: Container(
          height: 68,
          decoration: BoxDecoration(
            color: RannaTheme.card.withValues(alpha: 0.75),
            borderRadius: BorderRadius.circular(RannaTheme.radiusXl),
            border: Border.all(color: RannaTheme.border.withValues(alpha: 0.8)),
            boxShadow: RannaTheme.shadowFloat,
          ),
          padding: const EdgeInsets.symmetric(horizontal: 8),
          child: Row(
            children: List.generate(_tabs.length, (index) {
              final tab = _tabs[index];
              final isActive = index == currentIndex;
              return Expanded(
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () {
                    // Always close full player when tapping tabs to ensure content visibility
                    ref.read(audioPlayerProvider.notifier).closeFullPlayer();
                    navigationShell.goBranch(index, initialLocation: index == navigationShell.currentIndex);
                  },
                  child: _AnimatedTab(
                    icon: isActive ? tab.activeIcon : tab.icon,
                    label: tab.label,
                    isActive: isActive,
                  ),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }
}

class _TabData {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  const _TabData({required this.icon, required this.activeIcon, required this.label});
}

class _AnimatedTab extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isActive;

  const _AnimatedTab({
    required this.icon,
    required this.label,
    required this.isActive,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOutCubic,
        padding: EdgeInsets.symmetric(
          horizontal: isActive ? 10 : 8,
          vertical: isActive ? 10 : 8,
        ),
        decoration: BoxDecoration(
          color: isActive ? RannaTheme.navActiveIndicator : Colors.transparent,
          borderRadius: BorderRadius.circular(RannaTheme.radiusFull),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 20,
              color: isActive ? RannaTheme.navSelected : RannaTheme.navUnselected,
            ),
            if (isActive) ...[
              const SizedBox(width: 4),
              Flexible(
                child: Text(
                  label,
                  style: TextStyle(
                    fontFamily: RannaTheme.fontKufam,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: RannaTheme.navSelected,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
