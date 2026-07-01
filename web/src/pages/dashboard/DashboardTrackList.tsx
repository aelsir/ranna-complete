/**
 * Generic dashboard track table.
 *
 * Renders a fixed frame — selection checkbox, thumbnail with play overlay,
 * and an actions cell — around a configurable set of data columns (see
 * track-table-columns.tsx). Sections differ only in the `columns` prop.
 */

import { Fragment } from "react";
import { motion } from "framer-motion";
import {
  Music,
  Edit3,
  Play,
  Pause,
  CheckSquare,
  Square,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { InlineEditTable } from "@/components/InlineEditTable";
import type { ExtendedTrack, MappedArtist, MappedNarrator } from "./dashboard-types";
import type { TrackColumn } from "./track-table-columns";
import { getImageUrl } from "@/lib/format";
import type { PendingEdits } from "@/types/bulk-edit";
import type { MadhaInsert } from "@/types/database";

/**
 * Page items with ellipsis: always 1 and last, plus a window around the
 * current page. E.g. current=7/20 → [1, …, 6, 7, 8, …, 20].
 */
function getPageItems(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages = new Set<number>([1, total]);
  for (let p = current - 1; p <= current + 1; p++) {
    if (p >= 1 && p <= total) pages.add(p);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const items: (number | "ellipsis")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) items.push("ellipsis");
    items.push(sorted[i]);
  }
  return items;
}

interface Props {
  tracks: ExtendedTrack[];
  /** Data columns between the thumbnail and the actions cell. */
  columns: TrackColumn[];
  selectedTracks: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onEditTrack: (track: ExtendedTrack) => void;
  onRightClickDetect: (e: React.MouseEvent, id: string, callback: () => void) => void;

  // Sort
  sortBy: "created_at" | "play_count";
  sortAscending: boolean;
  onSortChange: (field: "created_at" | "play_count") => void;

  // Pagination
  totalCount: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  sectionLabel?: string;

  // Playback
  nowPlayingId: string | null;
  onPlayTrack: (id: string) => void;

  // Inline edit mode
  isEditMode: boolean;
  pendingEdits: PendingEdits;
  onEditChange: (trackId: string, field: keyof MadhaInsert, value: string | null) => void;
  artists: MappedArtist[];
  narrators: MappedNarrator[];
}

export function DashboardTrackList({
  tracks,
  columns,
  selectedTracks,
  onToggleSelect,
  onSelectAll,
  onEditTrack,
  onRightClickDetect,
  sortBy,
  sortAscending,
  onSortChange,
  totalCount,
  currentPage,
  totalPages,
  onPageChange,
  sectionLabel,
  nowPlayingId,
  onPlayTrack,
  isEditMode,
  pendingEdits,
  onEditChange,
  artists,
  narrators,
}: Props) {
  if (isEditMode) {
    return (
      <InlineEditTable
        tracks={tracks}
        selectedTrackIds={selectedTracks}
        artists={artists.map((a) => ({ id: a.id, name: a.name }))}
        narrators={narrators.map((n) => ({ id: n.id, name: n.name }))}
        pendingEdits={pendingEdits}
        onEditChange={onEditChange}
        onToggleSelect={onToggleSelect}
        onSelectAll={onSelectAll}
        nowPlayingId={nowPlayingId}
        onPlayTrack={(id) => onPlayTrack(id)}
      />
    );
  }

  // select + thumbnail + data columns + actions
  const gridTemplateColumns = `40px 40px ${columns.map((c) => c.width).join(" ")} 90px`;

  return (
    <>
      {/* Table Header */}
      <div
        className="grid gap-3 px-4 py-2.5 text-[11px] font-fustat font-bold text-muted-foreground uppercase tracking-wide"
        style={{ gridTemplateColumns }}
      >
        <button onClick={onSelectAll} className="flex items-center justify-center">
          {selectedTracks.size === tracks.length && tracks.length > 0 ? (
            <CheckSquare className="h-4 w-4 text-primary" />
          ) : (
            <Square className="h-4 w-4" />
          )}
        </button>
        <span></span>
        {columns.map((col) =>
          col.sortField ? (
            <button
              key={col.id}
              className="flex items-center justify-center gap-1 w-full hover:text-foreground transition-colors"
              onClick={() => onSortChange(col.sortField!)}
            >
              <span>{col.header}</span>
              {sortBy === col.sortField
                ? sortAscending ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                : <ArrowUpDown className="h-3 w-3 opacity-40" />}
            </button>
          ) : (
            <span key={col.id}>{col.header}</span>
          ),
        )}
        <span className="text-center">إجراءات</span>
      </div>
      <Separator className="mb-1" />

      {/* Rows */}
      <div className="space-y-1">
        {tracks.map((track) => {
          const isPlaying = nowPlayingId === track.id;
          return (
            <motion.div
              key={track.id}
              layout
              className={`grid gap-3 items-center px-4 py-2.5 rounded-xl text-sm transition-colors cursor-pointer ${
                selectedTracks.has(track.id)
                  ? "bg-primary/5 border border-primary/20"
                  : "hover:bg-muted/50 border border-transparent"
              }`}
              style={{ gridTemplateColumns }}
              onClick={() => onToggleSelect(track.id)}
              onDoubleClick={(e) => { e.stopPropagation(); onEditTrack(track); }}
              onContextMenu={(e) => onRightClickDetect(e, track.id, () => onEditTrack(track))}
            >
              <div className="flex items-center justify-center">
                {selectedTracks.has(track.id) ? (
                  <CheckSquare className="h-4 w-4 text-primary" />
                ) : (
                  <Square className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="relative">
                <img
                  src={getImageUrl(track.thumbnail)}
                  alt={track.title}
                  className="h-9 w-9 rounded-lg object-cover"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlayTrack(track.id);
                  }}
                  className={`absolute inset-0 flex items-center justify-center rounded-lg transition-all ${
                    isPlaying ? "bg-primary/80" : "bg-black/0 hover:bg-black/40"
                  }`}
                >
                  {isPlaying ? (
                    <Pause className="h-3.5 w-3.5 text-white fill-white" />
                  ) : (
                    <Play className="h-3.5 w-3.5 text-white fill-white opacity-0 group-hover:opacity-100 hover:!opacity-100" style={{ opacity: undefined }} />
                  )}
                </button>
              </div>
              {columns.map((col) => (
                <Fragment key={col.id}>{col.cell(track)}</Fragment>
              ))}
              <div className="flex items-center justify-center">
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 gap-1.5 font-fustat text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditTrack(track);
                  }}
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  تعديل
                </Button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {tracks.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <Music className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-fustat">لا توجد نتائج</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 px-4">
          <span className="text-xs text-muted-foreground font-fustat">
            {totalCount} {sectionLabel || "محتوى"} — صفحة {currentPage} من {totalPages}
          </span>
          <div className="flex items-center gap-1">
            {getPageItems(currentPage, totalPages).map((item, idx) =>
              item === "ellipsis" ? (
                <span key={`ellipsis-${idx}`} className="px-1 text-xs text-muted-foreground select-none">
                  …
                </span>
              ) : (
                <Button
                  key={item}
                  variant={item === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(item)}
                  className="text-xs min-w-8 px-2"
                >
                  {item}
                </Button>
              ),
            )}
          </div>
        </div>
      )}
    </>
  );
}
