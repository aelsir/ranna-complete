import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { CONTENT_TYPES } from "@/types/database";
import type { MappedArtist, MappedNarrator, MappedTariqa, MappedFan } from "./dashboard-types";

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
