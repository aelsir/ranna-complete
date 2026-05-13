import { useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CheckSquare,
  Square,
  GripVertical,
  X as XIcon,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type PickerTrack = {
  id: string;
  title: string;
  artistName: string;
  narratorName?: string;
  madihId?: string;
};

export type PickerArtist = { id: string; name: string };

interface Props {
  selectedIds: string[];
  onChange: (next: string[]) => void;
  /** Full unfiltered track set, used to render rows in the sortable section
   *  even when the picker is filtered or the track isn't currently visible. */
  allTracks: PickerTrack[];
  /** Currently visible (filtered) tracks for the picker section. */
  pickerTracks: PickerTrack[];
  artists: PickerArtist[];
  artistFilter: string;
  setArtistFilter: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
  disabled?: boolean;
}

/**
 * Picker for tracks inside a collection.
 * - Top section: currently selected tracks, drag/keyboard reorderable.
 * - Bottom section: filterable picker for adding/removing tracks.
 *
 * The order of `selectedIds` is the persisted order — when the parent
 * saves it through `updateCollection`, each entry is written with
 * `position: index`.
 */
export function CollectionTrackPicker({
  selectedIds,
  onChange,
  allTracks,
  pickerTracks,
  artists,
  artistFilter,
  setArtistFilter,
  search,
  setSearch,
  disabled = false,
}: Props) {
  const trackById = useMemo(() => {
    const map = new Map<string, PickerTrack>();
    for (const t of allTracks) map.set(t.id, t);
    return map;
  }, [allTracks]);

  // Tracks rendered in the sortable list — preserves the parent's order.
  // If a track id has no metadata (e.g. dropped from library), we still
  // render a placeholder row so it stays addressable for removal.
  const orderedSelected: PickerTrack[] = useMemo(
    () =>
      selectedIds.map(
        (id) =>
          trackById.get(id) ?? {
            id,
            title: id,
            artistName: "",
          },
      ),
    [selectedIds, trackById],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = selectedIds.indexOf(String(active.id));
    const newIndex = selectedIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onChange(arrayMove(selectedIds, oldIndex, newIndex));
  };

  const togglePicker = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectAllVisible = () => {
    const set = new Set(selectedIds);
    for (const t of pickerTracks) set.add(t.id);
    // Preserve existing order, append new ones in pickerTracks order.
    const next = [
      ...selectedIds,
      ...pickerTracks.map((t) => t.id).filter((id) => !selectedIds.includes(id)),
    ];
    if (next.length !== set.size) {
      // Defensive: fall back if dedupe drift.
      onChange(Array.from(set));
    } else {
      onChange(next);
    }
  };

  const clearVisibleOrAll = () => {
    if (search || artistFilter) {
      const visibleIds = new Set(pickerTracks.map((t) => t.id));
      onChange(selectedIds.filter((id) => !visibleIds.has(id)));
    } else {
      onChange([]);
    }
  };

  return (
    <div className="space-y-4">
      {/* ───── Selected (sortable) ───── */}
      {selectedIds.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
            <label className="text-xs font-fustat text-muted-foreground">
              المقاطع المحددة (اسحب لإعادة الترتيب)
            </label>
            <span className="text-[11px] text-primary font-medium">
              {selectedIds.length} مقطع
            </span>
          </div>
          <div className="border border-border rounded-xl max-h-[35vh] overflow-auto p-2 space-y-1 bg-muted/30">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={selectedIds}
                strategy={verticalListSortingStrategy}
              >
                {orderedSelected.map((t, idx) => (
                  <SortableTrackRow
                    key={t.id}
                    track={t}
                    index={idx}
                    disabled={disabled}
                    onRemove={() => togglePicker(t.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </div>
      )}

      {/* ───── Picker ───── */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
          <label className="text-xs font-fustat text-muted-foreground">
            {selectedIds.length > 0 ? "إضافة من المكتبة" : "اختر المقاطع"}
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={artistFilter}
              onChange={(e) => setArtistFilter(e.target.value)}
              className="h-8 text-xs border border-border rounded-lg px-2 bg-background"
              disabled={disabled}
            >
              <option value="">كل المداحين</option>
              {artists.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <div className="relative w-full sm:w-56">
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث عن مقطع أو مادح..."
                className="h-8 pr-7 text-xs"
                disabled={disabled}
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-[11px] h-7 px-2"
            onClick={selectAllVisible}
            disabled={disabled}
          >
            تحديد الكل ({pickerTracks.length})
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-[11px] h-7 px-2"
            onClick={clearVisibleOrAll}
            disabled={disabled}
          >
            إلغاء التحديد
          </Button>
        </div>
        <div className="border border-border rounded-xl max-h-[35vh] overflow-auto p-2 space-y-1">
          {pickerTracks.map((t) => {
            const isSelected = selectedIds.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => togglePicker(t.id)}
                disabled={disabled}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-start transition-colors ${
                  isSelected
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted text-foreground"
                }`}
              >
                {isSelected ? (
                  <CheckSquare className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <Square className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                <span className="truncate">{t.title}</span>
                <span className="text-[10px] text-muted-foreground mr-auto">
                  {t.artistName}
                </span>
              </button>
            );
          })}
          {pickerTracks.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              لا توجد نتائج
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

interface RowProps {
  track: PickerTrack;
  index: number;
  disabled: boolean;
  onRemove: () => void;
}

function SortableTrackRow({ track, index, disabled, onRemove }: RowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: track.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-2 py-2 rounded-lg bg-background border border-border text-sm ${
        isDragging ? "shadow-lg z-10" : ""
      }`}
    >
      <button
        type="button"
        aria-label="إعادة ترتيب"
        className="cursor-grab active:cursor-grabbing touch-none p-1 -m-1 text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="text-[10px] font-mono text-muted-foreground w-5 text-center shrink-0">
        {index + 1}
      </span>
      <span className="truncate flex-1">{track.title}</span>
      {track.artistName && (
        <span className="text-[10px] text-muted-foreground hidden sm:inline truncate max-w-[120px]">
          {track.artistName}
        </span>
      )}
      <button
        type="button"
        aria-label="إزالة"
        onClick={onRemove}
        disabled={disabled}
        className="p-1 -m-1 text-muted-foreground hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
      >
        <XIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
