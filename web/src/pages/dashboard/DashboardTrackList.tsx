import { motion } from "framer-motion";
import {
  Music,
  Edit3,
  Play,
  Pause,
  Headphones,
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
import { getCompletionStatus } from "./dashboard-types";
import { getImageUrl } from "@/lib/format";
import type { PendingEdits } from "@/types/bulk-edit";
import type { MadhaInsert } from "@/types/database";

/** Small visual indicator for track metadata completeness */
function CompletionRing({ status }: { status: "complete" | "partial" | "basic" }) {
  const colors = {
    complete: "border-green-500 bg-green-500/20",
    partial: "border-yellow-500 bg-yellow-500/20",
    basic: "border-muted-foreground/30 bg-muted/30",
  };
  const dotColors = {
    complete: "bg-green-500",
    partial: "bg-yellow-500",
    basic: "bg-muted-foreground/40",
  };
  return (
    <div className={`h-3 w-3 rounded-full border-2 flex items-center justify-center ${colors[status]}`}>
      <div className={`h-1.5 w-1.5 rounded-full ${dotColors[status]}`} />
    </div>
  );
}

interface Props {
  tracks: ExtendedTrack[];
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

  return (
    <>
      {/* Table Header */}
      <div className="grid grid-cols-[40px_40px_1.5fr_1fr_1fr_80px_80px_90px] gap-3 px-4 py-2.5 text-[11px] font-fustat font-bold text-muted-foreground uppercase tracking-wide">
        <button onClick={onSelectAll} className="flex items-center justify-center">
          {selectedTracks.size === tracks.length && tracks.length > 0 ? (
            <CheckSquare className="h-4 w-4 text-primary" />
          ) : (
            <Square className="h-4 w-4" />
          )}
        </button>
        <span></span>
        <span>العنوان</span>
        <span>المادح</span>
        <span>الراوي</span>
        <button
          className="flex items-center justify-center gap-1 w-full hover:text-foreground transition-colors"
          onClick={() => onSortChange("play_count")}
        >
          <span>التشغيل</span>
          {sortBy === "play_count"
            ? sortAscending ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
            : <ArrowUpDown className="h-3 w-3 opacity-40" />}
        </button>
        <button
          className="flex items-center justify-center gap-1 w-full hover:text-foreground transition-colors"
          onClick={() => onSortChange("created_at")}
        >
          <span>تاريخ الإضافة</span>
          {sortBy === "created_at"
            ? sortAscending ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
            : <ArrowUpDown className="h-3 w-3 opacity-40" />}
        </button>
        <span className="text-center">إجراءات</span>
      </div>
      <Separator className="mb-1" />

      {/* Rows */}
      <div className="space-y-1">
        {tracks.map((track) => {
          const status = getCompletionStatus(track);
          const isPlaying = nowPlayingId === track.id;
          const relativeDate = track.createdAt
            ? (() => {
                const diff = Date.now() - new Date(track.createdAt).getTime();
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                if (days === 0) return "اليوم";
                if (days === 1) return "أمس";
                if (days < 7) return `${days} أيام`;
                if (days < 30) return `${Math.floor(days / 7)} أسابيع`;
                return `${Math.floor(days / 30)} شهر`;
              })()
            : "—";
          return (
            <motion.div
              key={track.id}
              layout
              className={`grid grid-cols-[40px_40px_1.5fr_1fr_1fr_80px_80px_90px] gap-3 items-center px-4 py-2.5 rounded-xl text-sm transition-colors cursor-pointer ${
                selectedTracks.has(track.id)
                  ? "bg-primary/5 border border-primary/20"
                  : "hover:bg-muted/50 border border-transparent"
              }`}
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
              <div className="flex items-center gap-2 min-w-0">
                <CompletionRing status={status} />
                <div className="min-w-0">
                  <p className="font-fustat font-semibold text-foreground truncate">{track.title}</p>
                  <span className={`text-[10px] ${
                    status === "complete" ? "text-green-600" : status === "partial" ? "text-yellow-600" : "text-muted-foreground/60"
                  }`}>
                    {status === "complete" ? "مكتملة" : status === "partial" ? "ناقصة جزئياً" : "بيانات أساسية"}
                  </span>
                </div>
              </div>
              <span className="text-muted-foreground truncate">{track.artistName}</span>
              <span className="text-muted-foreground truncate">{track.narratorName}</span>
              <span className="text-muted-foreground text-center text-xs flex items-center justify-center gap-1">
                <Headphones className="h-3 w-3 opacity-50" />
                {(track.playCount || 0).toLocaleString("ar-SA")}
              </span>
              <span className="text-muted-foreground/60 text-center text-[10px]">{relativeDate}</span>
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
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => onPageChange(currentPage - 1)}
              className="text-xs"
            >
              السابق
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              className="text-xs"
            >
              التالي
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
