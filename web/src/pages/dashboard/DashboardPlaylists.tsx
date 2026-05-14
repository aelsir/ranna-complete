import { Edit3, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { getImageUrl } from "@/lib/format";
import type { ExtendedPlaylist, ExtendedTrack } from "./dashboard-types";

interface Props {
  playlists: ExtendedPlaylist[];
  tracks: ExtendedTrack[];
  dragOverId: string | null;
  draggedId: string | null;
  onDragStart: (id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDrop: (id: string) => void;
  onDragEnd: () => void;
  onToggleActive: (id: string) => void;
  onEdit: (pl: ExtendedPlaylist) => void;
  onRightClickDetect: (e: React.MouseEvent, id: string, cb: () => void) => void;
}

export function DashboardPlaylists({
  playlists,
  tracks,
  dragOverId,
  draggedId,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onToggleActive,
  onEdit,
  onRightClickDetect,
}: Props) {
  return (
    <div className="space-y-2">
      {playlists.map((pl) => (
        <div
          key={pl.id}
          draggable
          onDragStart={() => onDragStart(pl.id)}
          onDragOver={(e) => onDragOver(e, pl.id)}
          onDrop={() => onDrop(pl.id)}
          onDragEnd={onDragEnd}
          className={`flex items-center gap-4 bg-card rounded-2xl border p-4 transition-all ${
            dragOverId === pl.id ? "border-primary shadow-md" : "border-border"
          } ${!pl.isActive ? "opacity-50" : ""} ${
            draggedId === pl.id ? "opacity-30" : ""
          }`}
          onDoubleClick={(e) => { e.stopPropagation(); onEdit(pl); }}
          onContextMenu={(e) => onRightClickDetect(e, pl.id, () => onEdit(pl))}
        >
          <GripVertical className="h-5 w-5 text-muted-foreground/40 cursor-grab shrink-0" />
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 font-mono">
            {pl.order + 1}
          </Badge>
          <img
            src={getImageUrl(pl.image)}
            alt={pl.title}
            className="h-14 w-14 rounded-xl object-cover shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-fustat font-bold text-sm text-foreground truncate">{pl.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{pl.desc}</p>
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {pl.trackIds.slice(0, 4).map((tid) => {
                const t = tracks.find((m) => m.id === tid);
                return t ? (
                  <Badge key={tid} variant="outline" className="text-[9px] px-1.5 py-0">
                    {t.title}
                  </Badge>
                ) : null;
              })}
              {pl.trackIds.length > 4 && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                  +{pl.trackIds.length - 4}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-fustat ${pl.isActive ? "text-green-600" : "text-muted-foreground"}`}>
                {pl.isActive ? "نشطة" : "معطّلة"}
              </span>
              <Switch checked={pl.isActive} onCheckedChange={() => onToggleActive(pl.id)} />
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="h-8 gap-1.5 font-fustat text-xs"
              onClick={() => onEdit(pl)}
            >
              <Edit3 className="h-3.5 w-3.5" />
              تعديل
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
