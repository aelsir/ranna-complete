import { Music, Edit3, CheckSquare, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getImageUrl } from "@/lib/format";
import type { MappedArtist, MappedTariqa } from "./dashboard-types";
import type { Madih } from "@/types/database";

interface Props {
  artists: MappedArtist[];
  fetchedArtists: Madih[];
  tariqas: MappedTariqa[];
  selectedMadiheen: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onEditMadih: (madih: Madih | null) => void;
  onRightClickDetect: (e: React.MouseEvent, id: string, callback: () => void) => void;
  searchQuery: string;
}

export function DashboardMadiheen({
  artists,
  fetchedArtists,
  tariqas,
  selectedMadiheen,
  onToggleSelect,
  onSelectAll,
  onEditMadih,
  onRightClickDetect,
  searchQuery,
}: Props) {
  const filtered = artists.filter((a) => !searchQuery || a.name.includes(searchQuery));

  return (
    <>
      {/* Table Header */}
      <div className="grid grid-cols-[40px_40px_1.5fr_1fr_80px_80px] gap-3 px-4 py-2.5 text-[11px] font-fustat font-bold text-muted-foreground uppercase tracking-wide">
        <button
          onClick={onSelectAll}
          className="flex items-center justify-center"
        >
          {selectedMadiheen.size === artists.length && artists.length > 0 ? (
            <CheckSquare className="h-4 w-4 text-primary" />
          ) : (
            <Square className="h-4 w-4" />
          )}
        </button>
        <span></span>
        <span>الاسم</span>
        <span>الطريقة</span>
        <span>المدائح</span>
        <span className="text-center">إجراءات</span>
      </div>

      {/* Rows */}
      {filtered.map((artist) => {
        const madhCount = artist.trackCount;
        const isSelected = selectedMadiheen.has(artist.id);
        const madihData = fetchedArtists.find((m) => m.id === artist.id) || null;
        const tariqaName = madihData?.tariqa_id
          ? tariqas.find((t) => t.id === madihData.tariqa_id)?.name
          : "";
        return (
          <div
            key={artist.id}
            onClick={() => onToggleSelect(artist.id)}
            className={`grid grid-cols-[40px_40px_1.5fr_1fr_80px_80px] gap-3 px-4 py-2.5 items-center rounded-xl text-sm cursor-pointer transition-all duration-150 ${
              isSelected
                ? "bg-primary/10 border border-primary/20"
                : "hover:bg-muted/50 border border-transparent"
            }`}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onEditMadih(madihData);
            }}
            onContextMenu={(e) =>
              onRightClickDetect(e, artist.id, () => onEditMadih(madihData))
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
              {artist.image ? (
                <img
                  src={getImageUrl(artist.image)}
                  alt={artist.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <Music className="h-4 w-4" />
                </div>
              )}
            </div>
            <span className="font-fustat font-semibold text-foreground truncate">
              {artist.name}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              {tariqaName || "—"}
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
                  onEditMadih(madihData);
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
          <p className="text-sm">لا يوجد مادحين</p>
        </div>
      )}
    </>
  );
}
