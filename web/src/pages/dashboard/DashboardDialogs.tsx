import { BulkUploadDialog } from "@/components/BulkUploadDialog";
import { FloatingActionBar } from "@/components/FloatingActionBar";
import { FindReplaceDialog } from "@/components/FindReplaceDialog";
import ImageCropDialog from "@/components/ImageCropDialog";
import { TrackFormDialog } from "./TrackFormDialog";
import { MadihFormDialog } from "./MadihFormDialog";
import { RawiFormDialog } from "./RawiFormDialog";
import { PlaylistFormDialog } from "./PlaylistFormDialog";
import { BulkEditDialog } from "./BulkEditDialog";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import type {
  CropTarget,
  AudioUploadTarget,
  ExtendedTrack,
  ExtendedPlaylist,
  Playlist,
  MappedArtist,
  MappedNarrator,
  MappedTariqa,
  MappedFan,
} from "./dashboard-types";
import type { Madih, MadihInsert, Rawi, RawiInsert, MadhaInsert } from "@/types/database";
import type { PendingEdits } from "@/types/bulk-edit";

type ToastFn = (opts: { title: string; description?: string; variant?: "default" | "destructive" }) => void;

interface Props {
  // Reference data
  artists: MappedArtist[];
  narrators: MappedNarrator[];
  tariqas: MappedTariqa[];
  funoon: MappedFan[];
  fetchedTracks: { id: string }[];
  activeContentType: string;
  isContentSection: boolean;

  // Track form
  editingTrack: ExtendedTrack | null;
  setEditingTrack: (t: ExtendedTrack | null) => void;
  newTrack: Partial<ExtendedTrack>;
  setNewTrack: (v: Partial<ExtendedTrack> | ((p: Partial<ExtendedTrack>) => Partial<ExtendedTrack>)) => void;
  clearDraft: () => void;
  isAddDialogOpen: boolean;
  setIsAddDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleSaveTrack: () => void;
  handleAddTrack: () => void;
  createMadhaMutation: any;
  updateMadhaMutation: any;

  // Playlist form
  editingPlaylist: ExtendedPlaylist | null;
  setEditingPlaylist: (p: ExtendedPlaylist | null) => void;
  newPlaylist: Partial<Playlist & { selectedTrackIds: string[] }>;
  setNewPlaylist: (v: Partial<Playlist & { selectedTrackIds: string[] }>) => void;
  isPlaylistDialogOpen: boolean;
  setIsPlaylistDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  playlistAllTracks: { id: string; title: string; artistName: string; narratorName: string; madihId: string }[];
  playlistPickerTracks: { id: string; title: string; artistName: string; narratorName: string; madihId: string }[];
  playlistArtistFilter: string;
  setPlaylistArtistFilter: (v: string) => void;
  playlistTrackSearch: string;
  setPlaylistTrackSearch: (v: string) => void;
  handleAddPlaylist: () => void;
  handleSavePlaylist: () => void;
  createCollectionMutation: any;
  updateCollectionMutation: any;

  // Madih form
  editingMadih: Madih | null;
  setEditingMadih: (m: Madih | null) => void;
  newMadih: Partial<MadihInsert>;
  setNewMadih: (v: Partial<MadihInsert>) => void;
  isAddMadihDialogOpen: boolean;
  setIsAddMadihDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  createMadihMutation: any;
  updateMadihMutation: any;

  // Rawi form
  editingRawi: Rawi | null;
  setEditingRawi: (r: Rawi | null) => void;
  newRawi: Partial<RawiInsert>;
  setNewRawi: (v: Partial<RawiInsert>) => void;
  isAddRawiDialogOpen: boolean;
  setIsAddRawiDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  createRawiMutation: any;
  updateRawiMutation: any;

  // Bulk edit
  bulkEditField: string | null;
  setBulkEditField: (v: string | null) => void;
  handleBulkUpdate: (field: string, value: string) => void;

  // Delete confirm
  deleteConfirm: { type: "tracks" | "madiheen" | "ruwat" } | null;
  setDeleteConfirm: React.Dispatch<React.SetStateAction<{ type: "tracks" | "madiheen" | "ruwat" } | null>>;
  confirmDelete: () => void;
  getDeleteDescription: () => { title: string; desc: string };
  deleteMadhaatMutation: any;
  deleteMadiheenMutation: any;
  deleteRuwatMutation: any;

  // Image / audio uploads
  fileInputRef: React.RefObject<HTMLInputElement>;
  audioFileInputRef: React.RefObject<HTMLInputElement>;
  handleFileSelected: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAudioFileSelected: (e: React.ChangeEvent<HTMLInputElement>) => void;
  cropImageSrc: string | null;
  imageUploading: boolean;
  setCropImageSrc: (v: string | null) => void;
  setCropTarget: (v: CropTarget | null) => void;
  handleCroppedUpload: (file: File) => void;
  audioUploading: boolean;
  audioUploadTarget: AudioUploadTarget | null;
  openImagePicker: (target: CropTarget) => void;
  openAudioPicker: (target: AudioUploadTarget) => void;
  fileInputClick: () => void;

  // Bulk upload + find/replace
  isBulkUploadOpen: boolean;
  setIsBulkUploadOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isFindReplaceOpen: boolean;
  setIsFindReplaceOpen: React.Dispatch<React.SetStateAction<boolean>>;
  allTracksForReplace: any[] | undefined;
  isLoadingAllTracks: boolean;
  handleBatchSave: (updates: { id: string; changes: Partial<MadhaInsert> }[]) => void;
  batchUpdateMutation: any;

  // Floating action bar
  selectedTracks: Set<string>;
  setSelectedTracks: React.Dispatch<React.SetStateAction<Set<string>>>;
  isEditMode: boolean;
  setIsEditMode: React.Dispatch<React.SetStateAction<boolean>>;
  pendingEdits: PendingEdits;
  handleInlineEditSave: () => void;
  handleCancelEditMode: () => void;
  handleDeleteSelected: () => void;

  toast: ToastFn;
}

export function DashboardDialogs(p: Props) {
  return (
    <>
      <TrackFormDialog
        isOpen={!!p.editingTrack || p.isAddDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            if (p.editingTrack) p.setEditingTrack(null);
            else {
              if (Object.keys(p.newTrack).length > 0) {
                const confirmed = window.confirm("هل تريد حذف المسودة وإغلاق النافذة؟");
                if (!confirmed) return;
                p.setNewTrack({});
                p.clearDraft();
              }
              p.setIsAddDialogOpen(false);
            }
          }
        }}
        isEdit={!!p.editingTrack}
        track={p.editingTrack || p.newTrack}
        onChange={(t) =>
          p.editingTrack
            ? p.setEditingTrack(t as ExtendedTrack)
            : p.setNewTrack(t as Partial<ExtendedTrack>)
        }
        artists={p.artists}
        narrators={p.narrators}
        tariqas={p.tariqas}
        funoon={p.funoon}
        isSaving={p.updateMadhaMutation.isPending || p.createMadhaMutation.isPending}
        onSave={p.editingTrack ? p.handleSaveTrack : p.handleAddTrack}
        audioUploading={p.audioUploading}
        audioUploadTarget={p.audioUploadTarget}
        openAudioPicker={p.openAudioPicker}
        openImagePicker={p.openImagePicker}
      />

      <PlaylistFormDialog
        isOpen={!!p.editingPlaylist || p.isPlaylistDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            p.setEditingPlaylist(null);
            p.setIsPlaylistDialogOpen(false);
          }
        }}
        isEdit={!!p.editingPlaylist}
        playlist={p.editingPlaylist || p.newPlaylist}
        onChange={(pl) =>
          p.editingPlaylist
            ? p.setEditingPlaylist(pl as ExtendedPlaylist)
            : p.setNewPlaylist(pl as Partial<ExtendedPlaylist>)
        }
        allTracks={p.playlistAllTracks}
        pickerTracks={p.playlistPickerTracks}
        artists={p.artists}
        artistFilter={p.playlistArtistFilter}
        setArtistFilter={p.setPlaylistArtistFilter}
        search={p.playlistTrackSearch}
        setSearch={p.setPlaylistTrackSearch}
        isSaving={p.updateCollectionMutation.isPending || p.createCollectionMutation.isPending}
        onSave={p.editingPlaylist ? p.handleSavePlaylist : p.handleAddPlaylist}
        openImagePicker={p.openImagePicker}
      />

      <MadihFormDialog
        isOpen={!!p.editingMadih || p.isAddMadihDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            p.setEditingMadih(null);
            p.setIsAddMadihDialogOpen(false);
            p.setNewMadih({});
          }
        }}
        isEdit={!!p.editingMadih}
        madih={p.editingMadih || p.newMadih}
        onChange={(m) =>
          p.editingMadih ? p.setEditingMadih(m as Madih) : p.setNewMadih(m as Partial<MadihInsert>)
        }
        tariqas={p.tariqas}
        fetchedTracks={p.fetchedTracks || []}
        isSaving={p.updateMadihMutation.isPending || p.createMadihMutation.isPending}
        onSave={() => {
          if (p.editingMadih) {
            p.updateMadihMutation.mutate(
              { id: p.editingMadih.id, updates: p.editingMadih },
              {
                onSuccess: () => {
                  p.setEditingMadih(null);
                  p.toast({ title: "تم الحفظ", description: "تم تحديث بيانات المادح" });
                },
                onError: (err: Error) => {
                  p.toast({ title: "خطأ", description: err.message, variant: "destructive" });
                },
              },
            );
          } else {
            p.createMadihMutation.mutate(p.newMadih as MadihInsert, {
              onSuccess: () => {
                p.setIsAddMadihDialogOpen(false);
                p.setNewMadih({});
                p.toast({ title: "تمت الإضافة", description: "تم إضافة المادح بنجاح" });
              },
              onError: (err: Error) => {
                p.toast({ title: "خطأ", description: err.message, variant: "destructive" });
              },
            });
          }
        }}
        openImagePicker={() => {
          p.setCropTarget(p.editingMadih ? "editMadih" : "addMadih");
          p.fileInputClick();
        }}
      />

      <RawiFormDialog
        isOpen={!!p.editingRawi || p.isAddRawiDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            p.setEditingRawi(null);
            p.setIsAddRawiDialogOpen(false);
            p.setNewRawi({});
          }
        }}
        isEdit={!!p.editingRawi}
        rawi={p.editingRawi || p.newRawi}
        onChange={(r) =>
          p.editingRawi ? p.setEditingRawi(r as Rawi) : p.setNewRawi(r as Partial<RawiInsert>)
        }
        fetchedTracks={p.fetchedTracks || []}
        isSaving={p.updateRawiMutation.isPending || p.createRawiMutation.isPending}
        onSave={() => {
          if (p.editingRawi) {
            p.updateRawiMutation.mutate(
              { id: p.editingRawi.id, updates: p.editingRawi },
              {
                onSuccess: () => {
                  p.setEditingRawi(null);
                  p.toast({ title: "تم الحفظ", description: "تم تحديث بيانات الراوي" });
                },
                onError: (err: Error) => {
                  p.toast({ title: "خطأ", description: err.message, variant: "destructive" });
                },
              },
            );
          } else {
            p.createRawiMutation.mutate(p.newRawi as RawiInsert, {
              onSuccess: () => {
                p.setIsAddRawiDialogOpen(false);
                p.setNewRawi({});
                p.toast({ title: "تمت الإضافة", description: "تم إضافة الراوي بنجاح" });
              },
              onError: (err: Error) => {
                p.toast({ title: "خطأ", description: err.message, variant: "destructive" });
              },
            });
          }
        }}
        openImagePicker={() => {
          p.setCropTarget(p.editingRawi ? "editRawi" : "addRawi");
          p.fileInputClick();
        }}
      />

      <BulkEditDialog
        isOpen={!!p.bulkEditField}
        onOpenChange={(open) => !open && p.setBulkEditField(null)}
        bulkEditField={p.bulkEditField}
        artists={p.artists}
        narrators={p.narrators}
        tariqas={p.tariqas}
        funoon={p.funoon}
        onBulkUpdate={p.handleBulkUpdate}
      />

      <DeleteConfirmDialog
        confirm={p.deleteConfirm}
        onClose={() => p.setDeleteConfirm(null)}
        onConfirm={p.confirmDelete}
        isPending={
          p.deleteMadhaatMutation.isPending ||
          p.deleteMadiheenMutation.isPending ||
          p.deleteRuwatMutation.isPending
        }
        title={p.getDeleteDescription().title}
        description={p.getDeleteDescription().desc}
      />

      <input
        ref={p.fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={p.handleFileSelected}
      />
      <input
        ref={p.audioFileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={p.handleAudioFileSelected}
      />

      {p.cropImageSrc && (
        <ImageCropDialog
          open={!!p.cropImageSrc}
          imageSrc={p.cropImageSrc}
          uploading={p.imageUploading}
          onClose={() => {
            p.setCropImageSrc(null);
            p.setCropTarget(null);
          }}
          onCropComplete={p.handleCroppedUpload}
        />
      )}

      <BulkUploadDialog
        open={p.isBulkUploadOpen}
        onOpenChange={p.setIsBulkUploadOpen}
        artists={p.artists.map((a) => ({ id: a.id, name: a.name }))}
        narrators={p.narrators.map((n) => ({ id: n.id, name: n.name }))}
        tariqas={p.tariqas.map((t) => ({ id: t.id, name: t.name }))}
        funoon={p.funoon.map((f) => ({ id: f.id, name: f.name }))}
        contentType={p.activeContentType || "madha"}
      />

      {p.isContentSection && (
        <FloatingActionBar
          selectedCount={p.selectedTracks.size}
          isEditMode={p.isEditMode}
          changeCount={p.pendingEdits.size}
          isSaving={p.batchUpdateMutation.isPending}
          isDeleting={p.deleteMadhaatMutation.isPending}
          onInlineEdit={() => p.setIsEditMode(true)}
          onFindReplace={() => p.setIsFindReplaceOpen(true)}
          onDelete={p.handleDeleteSelected}
          onClearSelection={() => p.setSelectedTracks(new Set())}
          onSave={p.handleInlineEditSave}
          onCancel={p.handleCancelEditMode}
          onBulkFieldEdit={(field) => p.setBulkEditField(field)}
          onPasteImage={() => p.openImagePicker("pasteTrack")}
        />
      )}

      <FindReplaceDialog
        open={p.isFindReplaceOpen}
        onOpenChange={p.setIsFindReplaceOpen}
        tracks={p.allTracksForReplace || []}
        isLoadingTracks={p.isLoadingAllTracks}
        artists={p.artists.map((a) => ({ id: a.id, name: a.name }))}
        narrators={p.narrators.map((n) => ({ id: n.id, name: n.name }))}
        tariqas={p.tariqas.map((t) => ({ id: t.id, name: t.name }))}
        funoon={p.funoon.map((f) => ({ id: f.id, name: f.name }))}
        onApply={p.handleBatchSave}
        isApplying={p.batchUpdateMutation.isPending}
      />
    </>
  );
}
