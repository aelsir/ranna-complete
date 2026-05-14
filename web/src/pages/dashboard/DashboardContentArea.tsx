import { motion, AnimatePresence } from "framer-motion";
import AnalyticsSection from "@/components/AnalyticsSection";
import { HeroImagesPanel } from "@/components/HeroImagesPanel";
import { DashboardTrackList } from "./DashboardTrackList";
import { DashboardMadiheen } from "./DashboardMadiheen";
import { DashboardRuwat } from "./DashboardRuwat";
import { DashboardPlaylists } from "./DashboardPlaylists";
import type {
  SidebarItem,
  ExtendedTrack,
  ExtendedPlaylist,
  MappedArtist,
  MappedNarrator,
  MappedTariqa,
} from "./dashboard-types";
import type { Madih, Rawi, MadhaInsert } from "@/types/database";
import type { PendingEdits } from "@/types/bulk-edit";

interface Props {
  activeSection: SidebarItem;
  isContentSection: boolean;

  // Track list
  paginatedMadhat: ExtendedTrack[];
  selectedTracks: Set<string>;
  onToggleTrackSelect: (id: string) => void;
  onSelectAllTracks: () => void;
  setEditingTrack: (t: ExtendedTrack | null) => void;
  onRightClickDetect: (e: React.MouseEvent, id: string, callback: () => void) => void;
  sortBy: "created_at" | "play_count";
  sortAscending: boolean;
  onSortChange: (field: "created_at" | "play_count") => void;
  totalTracksCount: number;
  currentPage: number;
  totalPages: number;
  setCurrentPage: (n: number) => void;
  sectionLabel?: string;
  nowPlayingId: string | null;
  playTrack: (id: string, queue: string[]) => void;
  isEditMode: boolean;
  pendingEdits: PendingEdits;
  onEditChange: (trackId: string, field: keyof MadhaInsert, value: string | null) => void;

  // Reference
  artists: MappedArtist[];
  narrators: MappedNarrator[];
  tariqas: MappedTariqa[];
  fetchedArtists: Madih[];
  fetchedNarrators: Rawi[];

  // Madiheen
  selectedMadiheen: Set<string>;
  setSelectedMadiheen: React.Dispatch<React.SetStateAction<Set<string>>>;
  setEditingMadih: (m: Madih | null) => void;
  searchQuery: string;

  // Ruwat
  selectedRuwat: Set<string>;
  setSelectedRuwat: React.Dispatch<React.SetStateAction<Set<string>>>;
  setEditingRawi: (r: Rawi | null) => void;

  // Playlists
  sortedPlaylists: ExtendedPlaylist[];
  madhat: ExtendedTrack[];
  dragOverId: string | null;
  draggedId: string | null;
  onDragStart: (id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDrop: (targetId: string) => void;
  onDragEnd: () => void;
  onTogglePlaylistActive: (id: string) => void;
  setEditingPlaylist: (p: ExtendedPlaylist | null) => void;
}

export function DashboardContentArea({
  activeSection,
  isContentSection,
  paginatedMadhat,
  selectedTracks,
  onToggleTrackSelect,
  onSelectAllTracks,
  setEditingTrack,
  onRightClickDetect,
  sortBy,
  sortAscending,
  onSortChange,
  totalTracksCount,
  currentPage,
  totalPages,
  setCurrentPage,
  sectionLabel,
  nowPlayingId,
  playTrack,
  isEditMode,
  pendingEdits,
  onEditChange,
  artists,
  narrators,
  tariqas,
  fetchedArtists,
  fetchedNarrators,
  selectedMadiheen,
  setSelectedMadiheen,
  setEditingMadih,
  searchQuery,
  selectedRuwat,
  setSelectedRuwat,
  setEditingRawi,
  sortedPlaylists,
  madhat,
  dragOverId,
  draggedId,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onTogglePlaylistActive,
  setEditingPlaylist,
}: Props) {
  return (
    <div className="flex-1 overflow-auto p-6">
      <AnimatePresence mode="wait">
        {activeSection === "analytics" && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            <AnalyticsSection />
          </motion.div>
        )}

        {isContentSection && (
          <motion.div
            key="madhat"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <DashboardTrackList
              tracks={paginatedMadhat}
              selectedTracks={selectedTracks}
              onToggleSelect={onToggleTrackSelect}
              onSelectAll={onSelectAllTracks}
              onEditTrack={setEditingTrack}
              onRightClickDetect={onRightClickDetect}
              sortBy={sortBy}
              sortAscending={sortAscending}
              onSortChange={onSortChange}
              totalCount={totalTracksCount}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              sectionLabel={sectionLabel}
              nowPlayingId={nowPlayingId}
              onPlayTrack={(id) => playTrack(id, paginatedMadhat.map((t) => t.id))}
              isEditMode={isEditMode}
              pendingEdits={pendingEdits}
              onEditChange={onEditChange}
              artists={artists}
              narrators={narrators}
            />
          </motion.div>
        )}

        {activeSection === "hero_images" && (
          <motion.div
            key="hero_images"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <HeroImagesPanel />
          </motion.div>
        )}

        {activeSection === "madiheen" && (
          <motion.div
            key="madiheen"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <DashboardMadiheen
              artists={artists}
              fetchedArtists={fetchedArtists}
              tariqas={tariqas}
              selectedMadiheen={selectedMadiheen}
              onToggleSelect={(id) => {
                setSelectedMadiheen((prev) => {
                  const next = new Set(prev);
                  next.has(id) ? next.delete(id) : next.add(id);
                  return next;
                });
              }}
              onSelectAll={() => {
                if (selectedMadiheen.size === artists.length && artists.length > 0) {
                  setSelectedMadiheen(new Set());
                } else {
                  setSelectedMadiheen(new Set(artists.map((a) => a.id)));
                }
              }}
              onEditMadih={setEditingMadih}
              onRightClickDetect={onRightClickDetect}
              searchQuery={searchQuery}
            />
          </motion.div>
        )}

        {activeSection === "ruwat" && (
          <motion.div
            key="ruwat"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <DashboardRuwat
              narrators={narrators}
              fetchedNarrators={fetchedNarrators}
              selectedRuwat={selectedRuwat}
              onToggleSelect={(id) => {
                setSelectedRuwat((prev) => {
                  const next = new Set(prev);
                  next.has(id) ? next.delete(id) : next.add(id);
                  return next;
                });
              }}
              onSelectAll={() => {
                if (selectedRuwat.size === narrators.length && narrators.length > 0) {
                  setSelectedRuwat(new Set());
                } else {
                  setSelectedRuwat(new Set(narrators.map((n) => n.id)));
                }
              }}
              onEditRawi={setEditingRawi}
              onRightClickDetect={onRightClickDetect}
              searchQuery={searchQuery}
            />
          </motion.div>
        )}

        {activeSection === "playlists" && (
          <motion.div
            key="playlists"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-2"
          >
            <DashboardPlaylists
              playlists={sortedPlaylists}
              tracks={madhat}
              dragOverId={dragOverId}
              draggedId={draggedId}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
              onToggleActive={onTogglePlaylistActive}
              onEdit={setEditingPlaylist}
              onRightClickDetect={onRightClickDetect}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
