import { useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  CheckSquare,
  Square,
  Play,
  Pause,
  Headphones,
  Edit3,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Separator } from "@/components/ui/separator";
import type { MadhaInsert } from "@/types/database";
import type { PendingEdits } from "@/types/bulk-edit";
import { getImageUrl } from "@/lib/format";

interface SelectOption {
  id: string;
  name: string;
}

interface TrackRow {
  id: string;
  title: string;
  artistId: string;
  artistName: string;
  narratorId: string;
  narratorName: string;
  thumbnail?: string;
  playCount?: number;
  updatedAt?: string;
}

interface InlineEditTableProps {
  tracks: TrackRow[];
  selectedTrackIds: Set<string>;
  artists: SelectOption[];
  narrators: SelectOption[];
  pendingEdits: PendingEdits;
  onEditChange: (trackId: string, field: keyof MadhaInsert, value: string | null) => void;
  onToggleSelect: (trackId: string) => void;
  onSelectAll: () => void;
  nowPlayingId: string | null;
  onPlayTrack: (trackId: string) => void;
}

function getRelativeDate(dateStr?: string): string {
  if (!dateStr) return "\u2014";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "\u0627\u0644\u064A\u0648\u0645";
  if (days === 1) return "\u0623\u0645\u0633";
  if (days < 7) return `${days} \u0623\u064A\u0627\u0645`;
  if (days < 30) return `${Math.floor(days / 7)} \u0623\u0633\u0627\u0628\u064A\u0639`;
  return `${Math.floor(days / 30)} \u0634\u0647\u0631`;
}

export function InlineEditTable({
  tracks,
  selectedTrackIds,
  artists,
  narrators,
  pendingEdits,
  onEditChange,
  onToggleSelect,
  onSelectAll,
  nowPlayingId,
  onPlayTrack,
}: InlineEditTableProps) {
  const tableRef = useRef<HTMLDivElement>(null);

  // Handle Escape key to signal cancel (parent handles confirmation)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Bubble up — parent listens for this
        window.dispatchEvent(new CustomEvent("inline-edit-escape"));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const isEditable = useCallback(
    (trackId: string) => selectedTrackIds.has(trackId),
    [selectedTrackIds]
  );

  const getEditValue = useCallback(
    (trackId: string, field: keyof MadhaInsert): string | undefined => {
      return pendingEdits.get(trackId)?.[field] as string | undefined;
    },
    [pendingEdits]
  );

  const hasChange = useCallback(
    (trackId: string, field: keyof MadhaInsert): boolean => {
      const edits = pendingEdits.get(trackId);
      return edits !== undefined && field in edits;
    },
    [pendingEdits]
  );

  const cellEditClass = (trackId: string, field: keyof MadhaInsert) =>
    hasChange(trackId, field)
      ? "border-s-2 border-s-amber-400 bg-amber-50/50 dark:bg-amber-900/10 rounded-md ps-2"
      : "";

  return (
    <div ref={tableRef}>
      {/* Edit mode indicator bar */}
      <div className="h-1 bg-amber-400/60 rounded-full mb-3" />

      {/* Table Header */}
      <div className="grid grid-cols-[40px_40px_1.5fr_1fr_1fr_80px_80px_90px] gap-3 px-4 py-2.5 text-[11px] font-fustat font-bold text-muted-foreground uppercase tracking-wide">
        <button onClick={onSelectAll} className="flex items-center justify-center">
          {selectedTrackIds.size === tracks.length && tracks.length > 0 ? (
            <CheckSquare className="h-4 w-4 text-primary" />
          ) : (
            <Square className="h-4 w-4" />
          )}
        </button>
        <span></span>
        <span>العنوان</span>
        <span>المادح</span>
        <span>الراوي</span>
        <span className="text-center">التشغيل</span>
        <span className="text-center">آخر تحديث</span>
        <span className="text-center">الحالة</span>
      </div>
      <Separator className="mb-1" />

      {/* Rows */}
      <div className="space-y-1">
        {tracks.map((track) => {
          const editable = isEditable(track.id);
          const isPlaying = nowPlayingId === track.id;
          const relativeDate = getRelativeDate(track.updatedAt);

          return (
            <motion.div
              key={track.id}
              layout
              className={`grid grid-cols-[40px_40px_1.5fr_1fr_1fr_80px_80px_90px] gap-3 items-center px-4 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                editable
                  ? "bg-primary/5 border border-primary/20"
                  : "opacity-40 hover:opacity-60 border border-transparent"
              }`}
              onClick={() => onToggleSelect(track.id)}
            >
              {/* Checkbox */}
              <div className="flex items-center justify-center">
                {selectedTrackIds.has(track.id) ? (
                  <CheckSquare className="h-4 w-4 text-primary" />
                ) : (
                  <Square className="h-4 w-4 text-muted-foreground" />
                )}
              </div>

              {/* Thumbnail */}
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
                    <Play className="h-3.5 w-3.5 text-white fill-white opacity-0 hover:!opacity-100" />
                  )}
                </button>
              </div>

              {/* Title — editable or static */}
              <div
                className={`min-w-0 ${cellEditClass(track.id, "title")}`}
                onClick={(e) => editable && e.stopPropagation()}
              >
                {editable ? (
                  <Input
                    value={getEditValue(track.id, "title") ?? track.title}
                    onChange={(e) => {
                      const newVal = e.target.value;
                      onEditChange(
                        track.id,
                        "title",
                        newVal === track.title ? null : newVal
                      );
                    }}
                    className="h-8 text-sm font-fustat font-semibold bg-transparent border-muted"
                    dir="rtl"
                  />
                ) : (
                  <p className="font-fustat font-semibold text-foreground truncate">
                    {track.title}
                  </p>
                )}
              </div>

              {/* Artist — editable or static */}
              <div
                className={`min-w-0 ${cellEditClass(track.id, "madih_id")}`}
                onClick={(e) => editable && e.stopPropagation()}
              >
                {editable ? (
                  <SearchableSelect
                    value={getEditValue(track.id, "madih_id") ?? track.artistId}
                    onValueChange={(v) => {
                      onEditChange(
                        track.id,
                        "madih_id",
                        v === track.artistId ? null : v
                      );
                    }}
                    options={artists.map((a) => ({ value: a.id, label: a.name }))}
                    placeholder="اختر المادح"
                    searchPlaceholder="ابحث عن مادح..."
                    triggerClassName="h-8 text-xs font-fustat"
                  />
                ) : (
                  <span className="text-muted-foreground truncate block font-fustat">
                    {track.artistName}
                  </span>
                )}
              </div>

              {/* Narrator — editable or static */}
              <div
                className={`min-w-0 ${cellEditClass(track.id, "rawi_id")}`}
                onClick={(e) => editable && e.stopPropagation()}
              >
                {editable ? (
                  <SearchableSelect
                    value={getEditValue(track.id, "rawi_id") ?? track.narratorId}
                    onValueChange={(v) => {
                      onEditChange(
                        track.id,
                        "rawi_id",
                        v === track.narratorId ? null : v
                      );
                    }}
                    options={narrators.map((n) => ({ value: n.id, label: n.name }))}
                    placeholder="اختر الراوي"
                    searchPlaceholder="ابحث عن راوي..."
                    triggerClassName="h-8 text-xs font-fustat"
                  />
                ) : (
                  <span className="text-muted-foreground truncate block font-fustat">
                    {track.narratorName}
                  </span>
                )}
              </div>

              {/* Play count */}
              <span className="text-muted-foreground text-center text-xs flex items-center justify-center gap-1">
                <Headphones className="h-3 w-3 opacity-50" />
                {(track.playCount || 0).toLocaleString("ar-SA")}
              </span>

              {/* Last updated */}
              <span className="text-muted-foreground/60 text-center text-[10px]">
                {relativeDate}
              </span>

              {/* Edit indicator */}
              <div className="flex items-center justify-center">
                {editable && pendingEdits.has(track.id) ? (
                  <span className="text-[10px] text-amber-600 font-fustat">معدّل</span>
                ) : editable ? (
                  <Edit3 className="h-3.5 w-3.5 text-muted-foreground/40" />
                ) : null}
              </div>
            </motion.div>
          );
        })}
      </div>

      {tracks.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <p className="font-fustat">لا توجد نتائج</p>
        </div>
      )}
    </div>
  );
}
