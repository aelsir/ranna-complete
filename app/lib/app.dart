import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ranna/theme/app_theme.dart';
import 'package:ranna/screens/home_screen.dart';
import 'package:ranna/screens/search_screen.dart';
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
final _shellNavigatorKey = GlobalKey<NavigatorState>();

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/',
    routes: [
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (context, state, child) {
          return ShellScaffold(child: child);
        },
        routes: [
          GoRoute(
            path: '/',
            builder: (context, state) => const HomeScreen(),
          ),
          GoRoute(
            path: '/search',
            builder: (context, state) => const SearchScreen(),
          ),
          GoRoute(
            path: '/browse',
            builder: (context, state) => const BrowseScreen(),
          ),
        ],
      ),
      GoRoute(
        path: '/profile/:type/:id',
        builder: (context, state) {
          final type = state.pathParameters['type']!;
          final id = state.pathParameters['id']!;
          return ProfileScreen(type: type, id: id);
        },
      ),
      GoRoute(
        path: '/playlist/:id',
        builder: (context, state) {
          final id = state.pathParameters['id']!;
          return PlaylistScreen(id: id);
        },
      ),
      GoRoute(
        path: '/artists',
        builder: (context, state) => const AllArtistsScreen(),
      ),
      GoRoute(
        path: '/narrators',
        builder: (context, state) => const AllNarratorsScreen(),
      ),
      GoRoute(
        path: '/tariqas',
        builder: (context, state) => const AllTariqasScreen(),
      ),
      GoRoute(
        path: '/funoon',
        builder: (context, state) => const AllFunoonScreen(),
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
      title: 'رنّة',
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

/// Shell scaffold wrapping bottom nav screens with mini player + bottom nav bar.
/// The full player overlays everything when opened.
class ShellScaffold extends ConsumerWidget {
  final Widget child;
  const ShellScaffold({super.key, required this.child});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isFullPlayerOpen = ref.watch(isFullPlayerOpenProvider);

    return Stack(
      children: [
        // Main content + mini player + nav bar
        Scaffold(
          body: Column(
            children: [
              Expanded(child: child),
              const MiniPlayer(),
            ],
          ),
          bottomNavigationBar: const _BottomNavBar(),
        ),
        // Full player overlay
        if (isFullPlayerOpen) const Positioned.fill(child: FullPlayer()),
      ],
    );
  }
}

class _BottomNavBar extends StatelessWidget {
  const _BottomNavBar();

  int _currentIndex(BuildContext context) {
    final location = GoRouterState.of(context).uri.path;
    if (location.startsWith('/search')) return 1;
    if (location.startsWith('/browse')) return 2;
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final index = _currentIndex(context);
    return NavigationBar(
      selectedIndex: index,
      onDestinationSelected: (i) {
        switch (i) {
          case 0:
            context.go('/');
          case 1:
            context.go('/search');
          case 2:
            context.go('/browse');
        }
      },
      destinations: const [
        NavigationDestination(
          icon: Icon(Icons.home_outlined),
          selectedIcon: Icon(Icons.home),
          label: 'الرئيسية',
        ),
        NavigationDestination(
          icon: Icon(Icons.search_outlined),
          selectedIcon: Icon(Icons.search),
          label: 'البحث',
        ),
        NavigationDestination(
          icon: Icon(Icons.explore_outlined),
          selectedIcon: Icon(Icons.explore),
          label: 'تصفح',
        ),
      ],
    );
  }
}
