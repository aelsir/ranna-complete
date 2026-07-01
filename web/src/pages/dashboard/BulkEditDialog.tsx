import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { CONTENT_TYPES } from "@/types/database";
import type { AudioQuality, LyricsStatus } from "@/types/database";
import {
  AUDIO_QUALITY_META,
  LYRICS_STATUS_META,
  type MappedArtist,
  type MappedNarrator,
  type MappedTariqa,
  type MappedFan,
} from "./dashboard-types";

const LYRICS_STATUS_ORDER: LyricsStatus[] = ["unreviewed", "needs_work", "reviewed"];
const AUDIO_QUALITY_ORDER: AudioQuality[] = ["poor", "good", "excellent"];

interface Props {
  field: string | null;
  onClose: () => void;
  onApply: (field: string, value: string) => void;
  artists: MappedArtist[];
  narrators: MappedNarrator[];
  tariqas: MappedTariqa[];
  funoon: MappedFan[];
}

export function BulkEditDialog({
  field,
  onClose,
  onApply,
  artists,
  narrators,
  tariqas,
  funoon,
}: Props) {
  return (
    <Dialog open={!!field} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-fustat">
            تعديل جماعي —{" "}
            {field === "artistId"
              ? "المادح"
              : field === "narratorId"
                ? "الراوي"
                : field === "tariqa"
                  ? "الطريقة"
                  : field === "fan"
                    ? "الفن"
                    : field === "contentType"
                      ? "نوع المحتوى"
                      : field === "lyricsStatus"
                        ? "حالة الكلمات"
                        : field === "audioQuality"
                          ? "جودة الصوت"
                          : ""}
          </DialogTitle>
        </DialogHeader>
        <div>
          {field === "artistId" ? (
            <SearchableSelect
              onValueChange={(v) => onApply("artistId", v)}
              options={artists.map((a) => ({ value: a.id, label: a.name }))}
              placeholder="اختر المادح"
              searchPlaceholder="ابحث عن مادح..."
            />
          ) : field === "narratorId" ? (
            <SearchableSelect
              onValueChange={(v) => onApply("narratorId", v)}
              options={narrators.map((n) => ({ value: n.id, label: n.name }))}
              placeholder="اختر الراوي"
              searchPlaceholder="ابحث عن راوي..."
            />
          ) : field === "lyricsStatus" ? (
            <div className="flex gap-2 flex-wrap">
              {LYRICS_STATUS_ORDER.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => onApply("lyricsStatus", status)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-fustat font-bold border bg-background text-muted-foreground border-border hover:border-primary/50 transition-all"
                >
                  <span className={`h-2.5 w-2.5 rounded-[3px] ${LYRICS_STATUS_META[status].color}`} />
                  {LYRICS_STATUS_META[status].label}
                </button>
              ))}
            </div>
          ) : field === "audioQuality" ? (
            <div className="flex gap-2 flex-wrap">
              {AUDIO_QUALITY_ORDER.map((quality) => (
                <button
                  key={quality}
                  type="button"
                  onClick={() => onApply("audioQuality", quality)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-fustat font-bold border bg-background text-muted-foreground border-border hover:border-primary/50 transition-all"
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${AUDIO_QUALITY_META[quality].color}`} />
                  {AUDIO_QUALITY_META[quality].label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => onApply("audioQuality", "unrated")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-fustat font-bold border bg-background text-muted-foreground border-border hover:border-primary/50 transition-all"
              >
                <span className="h-2.5 w-2.5 rounded-full border-2 border-dashed border-muted-foreground/40" />
                غير مقيّمة
              </button>
            </div>
          ) : field === "contentType" ? (
            <SearchableSelect
              onValueChange={(v) => onApply("contentType", v)}
              options={CONTENT_TYPES.map((ct) => ({ value: ct.value, label: `${ct.icon} ${ct.label}` }))}
              placeholder="اختر نوع المحتوى"
              searchPlaceholder="ابحث..."
            />
          ) : (
            <SearchableSelect
              onValueChange={(v) => onApply(field!, v)}
              options={(field === "tariqa" ? tariqas : funoon).map((item) => ({ value: item.name, label: item.name }))}
              placeholder="اختر"
              searchPlaceholder="ابحث..."
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
