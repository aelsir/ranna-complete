import { useState, useMemo, useCallback } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Loader2,
  Replace,
  Search,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { normalizeArabic } from "@/lib/arabic";
import type { MadhaInsert } from "@/types/database";
import type { EditableField, FindReplaceMatch } from "@/types/bulk-edit";

interface SelectOption {
  id: string;
  name: string;
}

export interface FindReplaceTrack {
  id: string;
  title: string;
  madih_id: string | null;
  rawi_id: string | null;
  tariqa_id: string | null;
  fan_id: string | null;
}

interface FindReplaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tracks: FindReplaceTrack[];
  isLoadingTracks: boolean;
  artists: SelectOption[];
  narrators: SelectOption[];
  tariqas: SelectOption[];
  funoon: SelectOption[];
  onApply: (updates: { id: string; changes: Partial<MadhaInsert> }[]) => void;
  isApplying: boolean;
}

const NULL_SENTINEL = "__none__";

const FIELD_OPTIONS: { value: EditableField; label: string }[] = [
  { value: "title", label: "العنوان" },
  { value: "madih_id", label: "المادح" },
  { value: "rawi_id", label: "الراوي" },
  { value: "tariqa_id", label: "الطريقة" },
  { value: "fan_id", label: "الفن" },
];

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function FindReplaceDialog({
  open,
  onOpenChange,
  tracks,
  isLoadingTracks,
  artists,
  narrators,
  tariqas,
  funoon,
  onApply,
  isApplying,
}: FindReplaceDialogProps) {
  const [selectedField, setSelectedField] = useState<EditableField>("title");
  const [findValue, setFindValue] = useState("");
  const [replaceValue, setReplaceValue] = useState("");
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);

  const isTextField = selectedField === "title";

  const getOptionsForField = useCallback(
    (field: EditableField): SelectOption[] => {
      switch (field) {
        case "madih_id":
          return artists;
        case "rawi_id":
          return narrators;
        case "tariqa_id":
          return tariqas;
        case "fan_id":
          return funoon;
        default:
          return [];
      }
    },
    [artists, narrators, tariqas, funoon]
  );

  const getFieldLabel = (field: EditableField): string =>
    FIELD_OPTIONS.find((o) => o.value === field)?.label || field;

  const getTrackFieldValue = useCallback(
    (track: FindReplaceTrack, field: EditableField): string | null => {
      switch (field) {
        case "title":
          return track.title;
        case "madih_id":
          return track.madih_id;
        case "rawi_id":
          return track.rawi_id;
        case "tariqa_id":
          return track.tariqa_id;
        case "fan_id":
          return track.fan_id;
        default:
          return null;
      }
    },
    []
  );

  const getDisplayName = useCallback(
    (field: EditableField, id: string | null): string => {
      if (!id) return "";
      if (field === "title") return id; // title IS the display value
      const options = getOptionsForField(field);
      return options.find((o) => o.id === id)?.name || "";
    },
    [getOptionsForField]
  );

  // Compute matches
  const matches: FindReplaceMatch[] = useMemo(() => {
    if (!findValue) return [];

    if (isTextField) {
      const normalizedFind = normalizeArabic(findValue);
      if (!normalizedFind) return [];

      return tracks
        .filter((t) => normalizeArabic(t.title).includes(normalizedFind))
        .map((t) => {
          const regex = new RegExp(escapeRegex(findValue), "gi");
          const newTitle = t.title.replace(regex, replaceValue);
          return {
            trackId: t.id,
            trackTitle: t.title,
            currentValue: t.title,
            newValue: newTitle,
            included: !excludedIds.has(t.id),
          };
        });
    } else {
      const isNullSearch = findValue === NULL_SENTINEL;
      return tracks
        .filter((t) => {
          const val = getTrackFieldValue(t, selectedField);
          return isNullSearch ? val === null : val === findValue;
        })
        .map((t) => ({
          trackId: t.id,
          trackTitle: t.title,
          currentValue: isNullSearch ? "—" : getDisplayName(selectedField, getTrackFieldValue(t, selectedField)),
          newValue: getDisplayName(selectedField, replaceValue),
          included: !excludedIds.has(t.id),
        }));
    }
  }, [
    findValue,
    replaceValue,
    isTextField,
    selectedField,
    tracks,
    excludedIds,
    getTrackFieldValue,
    getDisplayName,
  ]);

  const includedMatches = matches.filter((m) => m.included);

  const toggleMatch = (trackId: string) => {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return next;
    });
  };

  const toggleAll = () => {
    if (includedMatches.length === matches.length) {
      setExcludedIds(new Set(matches.map((m) => m.trackId)));
    } else {
      setExcludedIds(new Set());
    }
  };

  const handleApply = () => {
    if (!replaceValue && isTextField) return;
    if (!replaceValue && !isTextField) return;

    const updates = includedMatches.map((match) => {
      if (isTextField) {
        return {
          id: match.trackId,
          changes: { title: match.newValue } as Partial<MadhaInsert>,
        };
      } else {
        return {
          id: match.trackId,
          changes: { [selectedField]: replaceValue } as Partial<MadhaInsert>,
        };
      }
    });

    onApply(updates);
  };

  const handleFieldChange = (field: EditableField) => {
    setSelectedField(field);
    setFindValue("");
    setReplaceValue("");
    setExcludedIds(new Set());
    setShowConfirm(false);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setFindValue("");
      setReplaceValue("");
      setExcludedIds(new Set());
      setShowConfirm(false);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg font-fustat" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-fustat text-lg flex items-center gap-2">
            <Replace className="h-5 w-5" />
            بحث واستبدال
          </DialogTitle>
          {!isLoadingTracks && (
            <p className="text-xs text-muted-foreground font-fustat mt-1">
              البحث في جميع المدائح ({tracks.length})
            </p>
          )}
        </DialogHeader>

        {isLoadingTracks ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground font-fustat">جاري تحميل المدائح...</p>
          </div>
        ) : showConfirm ? (
          /* ── Confirmation Step ── */
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-fustat font-semibold text-amber-900 dark:text-amber-200">
                  تأكيد الاستبدال
                </p>
                <p className="text-xs text-amber-800 dark:text-amber-300 font-fustat leading-relaxed">
                  سيتم تعديل <strong>{includedMatches.length}</strong> مدحة.
                  {isTextField ? (
                    <> سيتم استبدال "<strong>{findValue}</strong>" بـ "<strong>{replaceValue}</strong>" في حقل {getFieldLabel(selectedField)}.</>
                  ) : (
                    <> سيتم تغيير {getFieldLabel(selectedField)} من "<strong>{findValue === NULL_SENTINEL ? "بدون قيمة" : getDisplayName(selectedField, findValue)}</strong>" إلى "<strong>{getDisplayName(selectedField, replaceValue)}</strong>".</>
                  )}
                </p>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 font-fustat">
                  هذا الإجراء لا يمكن التراجع عنه.
                </p>
              </div>
            </div>

            <DialogFooter className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs font-fustat"
                onClick={() => setShowConfirm(false)}
                disabled={isApplying}
              >
                رجوع
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="gap-1.5 text-xs font-fustat"
                disabled={isApplying}
                onClick={handleApply}
              >
                {isApplying ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                {isApplying
                  ? "جاري الاستبدال..."
                  : `تأكيد استبدال ${includedMatches.length} مدحة`}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* ── Main Search Step ── */
          <>
            <div className="space-y-4">
              {/* Field Segmented Control */}
              <div className="flex gap-1 bg-muted rounded-xl p-1">
                {FIELD_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleFieldChange(opt.value)}
                    className={`flex-1 text-xs py-2 px-3 rounded-lg font-fustat transition-all ${
                      selectedField === opt.value
                        ? "bg-background text-foreground shadow-sm font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Find & Replace Inputs */}
              {isTextField ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="ابحث عن..."
                      value={findValue}
                      onChange={(e) => setFindValue(e.target.value)}
                      className="pr-9 text-sm"
                      dir="rtl"
                      autoFocus
                    />
                  </div>
                  <div className="relative">
                    <Replace className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="استبدل بـ..."
                      value={replaceValue}
                      onChange={(e) => setReplaceValue(e.target.value)}
                      className="pr-9 text-sm"
                      dir="rtl"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] text-muted-foreground mb-1 block font-fustat">
                      الحالي
                    </label>
                    <SearchableSelect
                      value={findValue}
                      onValueChange={setFindValue}
                      options={[
                        { value: NULL_SENTINEL, label: "— بدون قيمة" },
                        ...getOptionsForField(selectedField).map((o) => ({
                          value: o.id,
                          label: o.name,
                        })),
                      ]}
                      placeholder="اختر..."
                      searchPlaceholder="ابحث..."
                      triggerClassName="h-9 text-xs"
                    />
                  </div>
                  <ArrowLeft className="h-4 w-4 text-muted-foreground mt-4 shrink-0" />
                  <div className="flex-1">
                    <label className="text-[10px] text-muted-foreground mb-1 block font-fustat">
                      الجديد
                    </label>
                    <SearchableSelect
                      value={replaceValue}
                      onValueChange={setReplaceValue}
                      options={getOptionsForField(selectedField).map((o) => ({
                        value: o.id,
                        label: o.name,
                      }))}
                      placeholder="اختر..."
                      searchPlaceholder="ابحث..."
                      triggerClassName="h-9 text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Match count + toggle all */}
              {findValue && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-fustat">
                      {matches.length > 0
                        ? `وُجدت ${matches.length} نتيجة`
                        : "لا توجد نتائج مطابقة"}
                    </span>
                    {matches.length > 0 && (
                      <button
                        onClick={toggleAll}
                        className="text-xs text-primary hover:underline font-fustat"
                      >
                        {includedMatches.length === matches.length
                          ? "إلغاء تحديد الكل"
                          : "تحديد الكل"}
                      </button>
                    )}
                  </div>
                  <Separator />
                </>
              )}

              {/* Preview List */}
              {matches.length > 0 && (
                <div className="max-h-64 overflow-y-auto space-y-1.5 -mx-1 px-1">
                  {matches.map((match) => (
                    <div
                      key={match.trackId}
                      className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs transition-colors ${
                        match.included
                          ? "border-border bg-background"
                          : "border-transparent bg-muted/30 opacity-50"
                      }`}
                    >
                      <Checkbox
                        checked={match.included}
                        onCheckedChange={() => toggleMatch(match.trackId)}
                        className="mt-0.5 shrink-0"
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="font-fustat font-semibold text-foreground truncate text-[11px]">
                          {match.trackTitle}
                        </p>
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span className="text-red-500/80 line-through truncate">
                            {match.currentValue}
                          </span>
                          <ArrowLeft className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="text-green-600 font-medium truncate">
                            {replaceValue ? match.newValue : "..."}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="flex items-center gap-2 mt-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs font-fustat"
                onClick={() => handleClose(false)}
              >
                إلغاء
              </Button>
              <Button
                size="sm"
                className="gap-1.5 text-xs font-fustat"
                disabled={includedMatches.length === 0 || !replaceValue}
                onClick={() => setShowConfirm(true)}
              >
                <Replace className="h-3.5 w-3.5" />
                استبدال {includedMatches.length} مدحة
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
