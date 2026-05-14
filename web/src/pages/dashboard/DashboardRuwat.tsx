import { Music, Edit3, CheckSquare, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getImageUrl } from "@/lib/format";
import type { MappedNarrator } from "./dashboard-types";
import type { Rawi } from "@/types/database";

interface Props {
  narrators: MappedNarrator[];
  fetchedNarrators: Rawi[];
  selectedRuwat: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onEditRawi: (rawi: Rawi | null) => void;
  onRightClickDetect: (e: React.MouseEvent, id: string, callback: () => void) => void;
  searchQuery: string;
}

export function DashboardRuwat({
  narrators,
  fetchedNarrators,
  selectedRuwat,
  onToggleSelect,
  onSelectAll,
  onEditRawi,
  onRightClickDetect,
  searchQuery,
}: Props) {
  const filtered = narrators.filter((n) => !searchQuery || n.name.includes(searchQuery));

  return (
    <>
      {/* Table Header */}
      <div className="grid grid-cols-[40px_40px_1.5fr_80px_80px] gap-3 px-4 py-2.5 text-[11px] font-fustat font-bold text-muted-foreground uppercase tracking-wide">
        <button
          onClick={onSelectAll}
          className="flex items-center justify-center"
        >
          {selectedRuwat.size === narrators.length && narrators.length > 0 ? (
            <CheckSquare className="h-4 w-4 text-primary" />
          ) : (
            <Square className="h-4 w-4" />
          )}
        </button>
        <span></span>
        <span>الاسم</span>
        <span>المدائح</span>
        <span className="text-center">إجراءات</span>
      </div>

      {/* Rows */}
      {filtered.map((narrator) => {
        const madhCount = narrator.trackCount;
        const isSelected = selectedRuwat.has(narrator.id);
        const rawiData = fetchedNarrators.find((r) => r.id === narrator.id) || null;
        return (
          <div
            key={narrator.id}
            onClick={() => onToggleSelect(narrator.id)}
            className={`grid grid-cols-[40px_40px_1.5fr_80px_80px] gap-3 px-4 py-2.5 items-center rounded-xl text-sm cursor-pointer transition-all duration-150 ${
              isSelected
                ? "bg-primary/10 border border-primary/20"
                : "hover:bg-muted/50 border border-transparent"
            }`}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onEditRawi(rawiData);
            }}
            onContextMenu={(e) =>
              onRightClickDetect(e, narrator.id, () => onEditRawi(rawiData))
            }
          >
            <div className="flex items-center justify-center">
              {isSelected ? (
                <CheckSquare className="h-4 w-4 text-primary" />
              ) : (
                <Square className="h-4 w-4 text-muted-foreground/40" />
              )}
            </div>
            <div className="w-9 h-9 rounded-lg overflow-hidden bg-muted">
              {narrator.image ? (
                <img
                  src={getImageUrl(narrator.image)}
                  alt={narrator.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <Music className="h-4 w-4" />
                </div>
              )}
            </div>
            <span className="font-fustat font-semibold text-foreground truncate">
              {narrator.name}
            </span>
            <Badge variant="outline" className="w-fit text-[10px]">
              {madhCount} مدحة
            </Badge>
            <div className="flex items-center justify-center">
              <Button
                variant="secondary"
                size="sm"
                className="h-8 gap-1.5 font-fustat text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditRawi(rawiData);
                }}
              >
                <Edit3 className="h-3.5 w-3.5" />
                تعديل
              </Button>
            </div>
          </div>
        );
      })}
      {filtered.length === 0 && (
        <div className="text-center py-20 text-muted-foreground font-fustat">
          <Music className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">لا يوجد رواة</p>
        </div>
      )}
    </>
  );
}
