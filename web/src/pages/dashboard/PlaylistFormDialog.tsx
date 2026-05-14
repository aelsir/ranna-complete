import { Plus, Save, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CollectionTrackPicker } from "@/components/CollectionTrackPicker";
import { getImageUrl } from "@/lib/format";
import type { ExtendedPlaylist, MappedArtist, Playlist } from "./dashboard-types";

interface PlaylistPickerTrack {
  id: string;
  title: string;
  artistName: string;
  narratorName: string;
  madihId: string;
}

// ============================================
// Add Playlist Dialog
// ============================================

interface AddPlaylistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playlist: Partial<Playlist & { selectedTrackIds: string[] }>;
  onChange: (pl: Partial<Playlist & { selectedTrackIds: string[] }>) => void;
  onSave: () => void;
  isPending: boolean;
  onOpenImagePicker: () => void;
  // Track picker
  allTracks: PlaylistPickerTrack[];
  pickerTracks: PlaylistPickerTrack[];
  artists: MappedArtist[];
  artistFilter: string;
  setArtistFilter: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
}

export function AddPlaylistDialog({
  open,
  onOpenChange,
  playlist,
  onChange,
  onSave,
  isPending,
  onOpenImagePicker,
  allTracks,
  pickerTracks,
  artists,
  artistFilter,
  setArtistFilter,
  search,
  setSearch,
}: AddPlaylistDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[95vw] sm:max-w-lg md:max-w-2xl lg:max-w-3xl xl:max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto"
        dir="rtl"
      >
        <DialogHeader>
          <DialogTitle className="font-fustat">إنشاء قائمة مميزة</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-fustat text-muted-foreground mb-1 block">اسم القائمة *</label>
            <Input
              value={playlist.title || ""}
              onChange={(e) => onChange({ ...playlist, title: e.target.value })}
              placeholder="مثال: مدائح رمضان"
            />
          </div>
          <div>
            <label className="text-xs font-fustat text-muted-foreground mb-1 block">الوصف</label>
            <Input
              value={playlist.desc || ""}
              onChange={(e) => onChange({ ...playlist, desc: e.target.value })}
              placeholder="وصف مختصر للقائمة"
            />
          </div>
          <div>
            <label className="text-xs font-fustat text-muted-foreground mb-1 block">صورة القائمة</label>
            <div className="flex items-center gap-3">
              {playlist.image && (
                <img src={getImageUrl(playlist.image)} alt="غلاف القائمة" className="h-16 w-16 rounded-xl object-cover shrink-0 border border-border" />
              )}
              <div className="flex-1 space-y-2">
                <Input
                  value={playlist.image || ""}
                  onChange={(e) => onChange({ ...playlist, image: e.target.value })}
                  placeholder="مثال: images/collections/cover.jpg"
                  dir="ltr"
                  className="text-sm"
                />
                <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs" onClick={onOpenImagePicker}>
                  <ImagePlus className="h-3 w-3" />
                  رفع صورة
                </Button>
              </div>
            </div>
          </div>
          <CollectionTrackPicker
            selectedIds={playlist.selectedTrackIds || []}
            onChange={(next) => onChange({ ...playlist, selectedTrackIds: next })}
            allTracks={allTracks}
            pickerTracks={pickerTracks}
            artists={artists}
            artistFilter={artistFilter}
            setArtistFilter={setArtistFilter}
            search={search}
            setSearch={setSearch}
            disabled={isPending}
          />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending} className="font-fustat">إلغاء</Button>
          <Button onClick={onSave} disabled={isPending} className="gap-1.5 font-fustat">
            <Plus className="h-3.5 w-3.5" />
            {isPending ? "جاري الإنشاء..." : "إنشاء القائمة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Edit Playlist Dialog
// ============================================

interface EditPlaylistDialogProps {
  playlist: ExtendedPlaylist | null;
  onClose: () => void;
  onChange: (pl: ExtendedPlaylist) => void;
  onSave: () => void;
  isPending: boolean;
  onOpenImagePicker: () => void;
  // Track picker
  allTracks: PlaylistPickerTrack[];
  pickerTracks: PlaylistPickerTrack[];
  artists: MappedArtist[];
  artistFilter: string;
  setArtistFilter: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
}

export function EditPlaylistDialog({
  playlist,
  onClose,
  onChange,
  onSave,
  isPending,
  onOpenImagePicker,
  allTracks,
  pickerTracks,
  artists,
  artistFilter,
  setArtistFilter,
  search,
  setSearch,
}: EditPlaylistDialogProps) {
  if (!playlist) return null;

  return (
    <Dialog open={!!playlist} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="w-[95vw] sm:max-w-lg md:max-w-2xl lg:max-w-3xl xl:max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto"
        dir="rtl"
      >
        <DialogHeader>
          <DialogTitle className="font-fustat">تعديل القائمة</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-fustat text-muted-foreground mb-1 block">اسم القائمة</label>
            <Input
              value={playlist.title}
              onChange={(e) => onChange({ ...playlist, title: e.target.value })}
              placeholder="مثال: مدائح رمضان"
            />
          </div>
          <div>
            <label className="text-xs font-fustat text-muted-foreground mb-1 block">الوصف</label>
            <Input
              value={playlist.desc}
              onChange={(e) => onChange({ ...playlist, desc: e.target.value })}
              placeholder="وصف مختصر للقائمة"
            />
          </div>
          <div>
            <label className="text-xs font-fustat text-muted-foreground mb-1 block">صورة القائمة</label>
            <div className="flex items-center gap-3">
              {playlist.image && (
                <img src={getImageUrl(playlist.image)} alt="غلاف القائمة" className="h-16 w-16 rounded-xl object-cover shrink-0 border border-border" />
              )}
              <div className="flex-1 space-y-2">
                <Input
                  value={playlist.image}
                  onChange={(e) => onChange({ ...playlist, image: e.target.value })}
                  placeholder="مثال: images/collections/cover.jpg"
                  dir="ltr"
                  className="text-sm"
                />
                <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs" onClick={onOpenImagePicker}>
                  <ImagePlus className="h-3 w-3" />
                  رفع صورة
                </Button>
              </div>
            </div>
          </div>
          <CollectionTrackPicker
            selectedIds={playlist.trackIds || []}
            onChange={(next) => onChange({ ...playlist, trackIds: next })}
            allTracks={allTracks}
            pickerTracks={pickerTracks}
            artists={artists}
            artistFilter={artistFilter}
            setArtistFilter={setArtistFilter}
            search={search}
            setSearch={setSearch}
            disabled={isPending}
          />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending} className="font-fustat">إلغاء</Button>
          <Button onClick={onSave} disabled={isPending} className="gap-1.5 font-fustat">
            <Save className="h-3.5 w-3.5" />
            {isPending ? "جاري الحفظ..." : "حفظ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Unified Wrapper
// ============================================

export function PlaylistFormDialog(props: any) {
  if (props.isEdit) {
    return (
      <EditPlaylistDialog
        playlist={props.playlist}
        onClose={() => props.onOpenChange(false)}
        onChange={props.onChange}
        onSave={props.onSave}
        isPending={props.isSaving}
        allTracks={props.allTracks}
        pickerTracks={props.pickerTracks}
        artists={props.artists}
        artistFilter={props.artistFilter}
        setArtistFilter={props.setArtistFilter}
        search={props.search}
        setSearch={props.setSearch}
        onOpenImagePicker={() => props.openImagePicker("editPlaylist")}
      />
    );
  }

  return (
    <AddPlaylistDialog
      open={props.isOpen}
      onOpenChange={props.onOpenChange}
      playlist={props.playlist}
      onChange={props.onChange}
      onSave={props.onSave}
      isPending={props.isSaving}
      allTracks={props.allTracks}
      pickerTracks={props.pickerTracks}
      artists={props.artists}
      artistFilter={props.artistFilter}
      setArtistFilter={props.setArtistFilter}
      search={props.search}
      setSearch={props.setSearch}
      onOpenImagePicker={() => props.openImagePicker("playlist")}
    />
  );
}
