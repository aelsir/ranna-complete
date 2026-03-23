import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { PlayerProvider } from "@/context/PlayerContext";
import { AuthProvider } from "@/context/AuthContext";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import Index from "./pages/Index";
import SearchPage from "./pages/SearchPage";
import FavoritesPage from "./pages/FavoritesPage";
import ProfilePage from "./pages/ProfilePage";
import PlaylistPage from "./pages/PlaylistPage";
import AllArtistsPage from "./pages/AllArtistsPage";
import AllNarratorsPage from "./pages/AllNarratorsPage";
import AllPlaylistsPage from "./pages/AllPlaylistsPage";
import AllTariqasPage from "./pages/AllTariqasPage";
import AllFunoonPage from "./pages/AllFunoonPage";
import DashboardPage from "./pages/DashboardPage";
import MyAccountPage from "./pages/MyAccountPage";
import ListeningHistoryPage from "./pages/ListeningHistoryPage";
import ListeningStatsPage from "./pages/ListeningStatsPage";
import TrackPage from "./pages/TrackPage";
import FontTestPage from "./pages/FontTestPage";
import NotFound from "./pages/NotFound";
import BottomTabs from "./components/BottomTabs";
import MiniPlayer from "./components/MiniPlayer";
import FullPlayer from "./components/FullPlayer";
import ContentShell from "./components/ContentShell";
import InstallPrompt from "./components/InstallPrompt";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <PlayerProvider>
          <Toaster />
          <Sonner />
          <InstallPrompt />
          <BrowserRouter>
          <ContentShell>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/favorites" element={<FavoritesPage />} />
              <Route path="/profile/:type/:id" element={<ProfilePage />} />
              <Route path="/track/:id" element={<TrackPage />} />
              <Route path="/playlist/:id" element={<PlaylistPage />} />
              <Route path="/artists" element={<AllArtistsPage />} />
              <Route path="/narrators" element={<AllNarratorsPage />} />
              <Route path="/playlists" element={<AllPlaylistsPage />} />
              <Route path="/tariqas" element={<AllTariqasPage />} />
              <Route path="/funoon" element={<AllFunoonPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/account" element={<MyAccountPage />} />
              <Route path="/listening-history" element={<ListeningHistoryPage />} />
              <Route path="/listening-stats" element={<ListeningStatsPage />} />
              <Route path="/font-test" element={<FontTestPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ContentShell>
          <MiniPlayer />
          <FullPlayer />
          <BottomTabs />
          </BrowserRouter>
        </PlayerProvider>
      </TooltipProvider>
    </AuthProvider>
    <Analytics />
    <SpeedInsights />
  </QueryClientProvider>
  </HelmetProvider>
);

export default App;
