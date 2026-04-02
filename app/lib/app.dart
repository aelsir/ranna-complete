import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ranna/providers/connectivity_provider.dart';
import 'package:ranna/services/sync_service.dart';
import 'package:ranna/theme/app_theme.dart';
import 'package:ranna/screens/home_screen.dart';
import 'package:ranna/screens/search_screen.dart';
import 'package:ranna/screens/favorites_screen.dart';
import 'package:ranna/screens/account_screen.dart';
import 'package:ranna/screens/browse_screen.dart';
import 'package:ranna/screens/profile_screen.dart';
import 'package:ranna/screens/playlist_screen.dart';
import 'package:ranna/screens/all_artists_screen.dart';
import 'package:ranna/screens/all_narrators_screen.dart';
import 'package:ranna/screens/all_tariqas_screen.dart';
import 'package:ranna/screens/all_funoon_screen.dart';
import 'package:ranna/components/player/mini_player.dart';
import 'package:ranna/components/player/full_player.dart';
import 'package:ranna/services/audio_player_service.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>();

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/',
    routes: [
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
                GoRoute(path: 'account', builder: (context, state) => const AccountScreen()),
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

    // Bottom nav height + spacing
    const navBarHeight = 68.0;
    const navBarBottomMargin = 2.0;
    // Mini player height
    const miniPlayerHeight = 72.0;

    final totalBottomForContent = navBarHeight + navBarBottomMargin + bottomPadding + 4 +
        (hasTrack ? miniPlayerHeight + 4 : 0);

    // Offline banner height (animated)
    const bannerHeight = 28.0;
    final showBanner = !isOnline;
    final contentTop = topPadding - 6 + (showBanner ? bannerHeight : 0);

    return Scaffold(
      backgroundColor: RannaTheme.background,
      body: Stack(
        children: [
          // ===== Content Shell =====
          AnimatedPositioned(
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeInOut,
            top: contentTop,
            left: 3,
            right: 3,
            bottom: totalBottomForContent,
            child: Container(
              decoration: BoxDecoration(
                color: RannaTheme.card,
                borderRadius: BorderRadius.circular(RannaTheme.radius3xl),
                border: Border.all(color: RannaTheme.border.withValues(alpha: 0.3)),
                boxShadow: RannaTheme.shadowCard,
              ),
              clipBehavior: Clip.antiAlias,
              child: MediaQuery.removePadding(
                context: context,
                removeTop: true,
                child: navigationShell,
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
            height: topPadding - 6 + bannerHeight,
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
          if (hasTrack)
            Positioned(
              left: 3,
              right: 3,
              bottom: navBarHeight + navBarBottomMargin + bottomPadding + 4,
              child: const MiniPlayer(),
            ),

          // ===== Bottom Navigation =====
          Positioned(
            left: 3,
            right: 3,
            bottom: navBarBottomMargin + bottomPadding,
            child: _FloatingBottomNav(navigationShell: navigationShell),
          ),

          // ===== Full Player Overlay =====
          if (isFullPlayerOpen)
            Positioned(
              left: 3,
              right: 3,
              top: contentTop,
              bottom: navBarHeight + navBarBottomMargin + bottomPadding + 4,
              child: const FullPlayer(),
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
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentIndex = navigationShell.currentIndex;

    return Container(
          height: 68,
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.97),
            borderRadius: BorderRadius.circular(RannaTheme.radiusXl),
            border: Border.all(color: RannaTheme.border.withValues(alpha: 0.15)),
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
                    // Close full player when switching tabs
                    if (index != currentIndex) {
                      ref.read(audioPlayerProvider.notifier).closeFullPlayer();
                    }
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
          horizontal: isActive ? 16 : 12,
          vertical: isActive ? 10 : 8,
        ),
        decoration: BoxDecoration(
          color: isActive ? RannaTheme.primary : Colors.transparent,
          borderRadius: BorderRadius.circular(RannaTheme.radiusFull),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 20,
              color: isActive ? Colors.white : RannaTheme.mutedForeground,
            ),
            if (isActive) ...[
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  fontFamily: RannaTheme.fontFustat,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
