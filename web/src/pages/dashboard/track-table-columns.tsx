/**
 * Column definitions for the dashboard track table.
 *
 * `DashboardTrackList` renders whatever columns it's given; each section
 * picks (or composes) a preset below. Adding a future view = declaring a new
 * column array here — no changes to the table component itself.
 *
 * The table always renders three fixed parts around these columns:
 * selection checkbox, thumbnail-with-play-overlay, and the actions cell.
 */

import { Headphones } from "lucide-react";
import type { ExtendedTrack } from "./dashboard-types";
import {
  AUDIO_QUALITY_META,
  LYRICS_STATUS_META,
  getCompletionStatus,
} from "./dashboard-types";

export interface TrackColumn {
  id: string;
  /** CSS grid track size, e.g. "1.5fr" or "80px". */
  width: string;
  header: string;
  /** When set, the header renders a sort toggle for this field. */
  sortField?: "created_at" | "play_count";
  cell: (track: ExtendedTrack) => React.ReactNode;
}

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

function relativeDate(iso: string | undefined): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "اليوم";
  if (days === 1) return "أمس";
  if (days < 7) return `${days} أيام`;
  if (days < 30) return `${Math.floor(days / 7)} أسابيع`;
  return `${Math.floor(days / 30)} شهر`;
}

// ============================================
// Individual columns
// ============================================

export const titleColumn: TrackColumn = {
  id: "title",
  width: "1.5fr",
  header: "العنوان",
  cell: (track) => {
    const status = getCompletionStatus(track);
    return (
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
    );
  },
};

export const artistColumn: TrackColumn = {
  id: "artist",
  width: "1fr",
  header: "المادح",
  cell: (track) => <span className="text-muted-foreground truncate">{track.artistName}</span>,
};

export const narratorColumn: TrackColumn = {
  id: "narrator",
  width: "1fr",
  header: "الراوي",
  cell: (track) => <span className="text-muted-foreground truncate">{track.narratorName}</span>,
};

export const writerColumn: TrackColumn = {
  id: "writer",
  width: "1fr",
  header: "الكاتب / الراوي",
  cell: (track) => <span className="text-muted-foreground truncate">{track.narratorName || "—"}</span>,
};

export const playsColumn: TrackColumn = {
  id: "plays",
  width: "80px",
  header: "التشغيل",
  sortField: "play_count",
  cell: (track) => (
    <span className="text-muted-foreground text-center text-xs flex items-center justify-center gap-1">
      <Headphones className="h-3 w-3 opacity-50" />
      {(track.playCount || 0).toLocaleString("ar-SA")}
    </span>
  ),
};

export const dateColumn: TrackColumn = {
  id: "created_at",
  width: "80px",
  header: "تاريخ الإضافة",
  sortField: "created_at",
  cell: (track) => (
    <span className="text-muted-foreground/60 text-center text-[10px]">{relativeDate(track.createdAt)}</span>
  ),
};

export const lyricsStatusColumn: TrackColumn = {
  id: "lyrics_status",
  width: "80px",
  header: "الكلمات",
  cell: (track) => {
    const meta = LYRICS_STATUS_META[track.lyricsStatus || "unreviewed"];
    return (
      <span className="flex items-center">
        <span title={meta.label} className={`h-3.5 w-3.5 rounded-[4px] shrink-0 ${meta.color}`} />
      </span>
    );
  },
};

export const audioQualityColumn: TrackColumn = {
  id: "audio_quality",
  width: "110px",
  header: "جودة الصوت",
  cell: (track) => {
    const meta = track.audioQuality ? AUDIO_QUALITY_META[track.audioQuality] : null;
    return (
      <span className="flex items-center gap-2">
        {meta ? (
          <>
            <span className={`h-3.5 w-3.5 rounded-full shrink-0 ${meta.color}`} />
            <span className="text-[11px] text-muted-foreground">{meta.label}</span>
          </>
        ) : (
          <>
            <span className="h-3.5 w-3.5 rounded-full shrink-0 border-2 border-dashed border-muted-foreground/40" />
            <span className="text-[11px] text-muted-foreground/60">غير مقيّمة</span>
          </>
        )}
      </span>
    );
  },
};

// ============================================
// Section presets
// ============================================

/** المدائح / القرآن / الدروس / الأذكار / الإنشاد */
export const CONTENT_COLUMNS: TrackColumn[] = [
  titleColumn,
  artistColumn,
  narratorColumn,
  playsColumn,
  dateColumn,
];

/** الكلمات (lyrics review) */
export const CURATION_COLUMNS: TrackColumn[] = [
  titleColumn,
  writerColumn,
  lyricsStatusColumn,
  audioQualityColumn,
];
