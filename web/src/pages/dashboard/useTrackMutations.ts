import { useCallback, useEffect } from "react";
import type { MadhaInsert } from "@/types/database";
import type { PendingEdits } from "@/types/bulk-edit";
import {
  ExtendedTrack,
  MappedArtist,
  MappedNarrator,
  MappedTariqa,
  MappedFan,
  SECTION_LABELS,
  SidebarItem,
  parseDuration,
} from "./dashboard-types";

type DeleteConfirm = { type: "tracks" | "madiheen" | "ruwat" } | null;
type ToastFn = (opts: { title: string; description?: string; variant?: "default" | "destructive" }) => void;

interface Params {
  // selection + edit targets
  selectedTracks: Set<string>;
  setSelectedTracks: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedMadiheen: Set<string>;
  setSelectedMadiheen: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedRuwat: Set<string>;
  setSelectedRuwat: React.Dispatch<React.SetStateAction<Set<string>>>;
  editingTrack: ExtendedTrack | null;
  setEditingTrack: React.Dispatch<React.SetStateAction<ExtendedTrack | null>>;
  newTrack: Partial<ExtendedTrack>;
  setNewTrack: (v: Partial<ExtendedTrack> | ((p: Partial<ExtendedTrack>) => Partial<ExtendedTrack>)) => void;
  clearDraft: () => void;
  setIsAddDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setBulkEditField: React.Dispatch<React.SetStateAction<string | null>>;
  deleteConfirm: DeleteConfirm;
  setDeleteConfirm: React.Dispatch<React.SetStateAction<DeleteConfirm>>;
  isEditMode: boolean;
  setIsEditMode: React.Dispatch<React.SetStateAction<boolean>>;
  pendingEdits: PendingEdits;
  setPendingEdits: React.Dispatch<React.SetStateAction<PendingEdits>>;

  // reference data
  activeSection: SidebarItem;
  artists: MappedArtist[];
  narrators: MappedNarrator[];
  tariqas: MappedTariqa[];
  funoon: MappedFan[];
  fetchedTracks: { id: string; madih_id?: string | null; rawi_id?: string | null }[];

  // mutations
  createMadhaMutation: any;
  updateMadhaMutation: any;
  deleteMadhaatMutation: any;
  bulkUpdateMadhaatMutation: any;
  batchUpdateMutation: any;
  deleteMadiheenMutation: any;
  deleteRuwatMutation: any;

  toast: ToastFn;
}

export function useTrackMutations({
  selectedTracks,
  setSelectedTracks,
  selectedMadiheen,
  setSelectedMadiheen,
  selectedRuwat,
  setSelectedRuwat,
  editingTrack,
  setEditingTrack,
  newTrack,
  setNewTrack,
  clearDraft,
  setIsAddDialogOpen,
  setBulkEditField,
  deleteConfirm,
  setDeleteConfirm,
  isEditMode,
  setIsEditMode,
  pendingEdits,
  setPendingEdits,
  activeSection,
  artists,
  narrators,
  tariqas,
  funoon,
  fetchedTracks,
  createMadhaMutation,
  updateMadhaMutation,
  deleteMadhaatMutation,
  bulkUpdateMadhaatMutation,
  batchUpdateMutation,
  deleteMadiheenMutation,
  deleteRuwatMutation,
  toast,
}: Params) {
  const sectionLabels = SECTION_LABELS[activeSection];

  const handleSaveTrack = () => {
    if (!editingTrack) return;
    const tariqaId = tariqas.find((t) => t.name === (editingTrack.tariqa === "none" ? "" : editingTrack.tariqa))?.id || null;
    const fanId = funoon.find((f) => f.name === (editingTrack.fan === "none" ? "" : editingTrack.fan))?.id || null;

    updateMadhaMutation.mutate(
      {
        id: editingTrack.id,
        updates: {
          title: editingTrack.title,
          madih_id: editingTrack.artistId || null,
          rawi_id: editingTrack.narratorId || null,
          tariqa_id: tariqaId,
          fan_id: fanId,
          lyrics: editingTrack.lyrics || null,
          recording_place: editingTrack.location || null,
          duration_seconds: parseDuration(editingTrack.duration),
          audio_url: editingTrack.audioUrl || null,
          image_url: editingTrack.imageUrl || null,
        },
      },
      {
        onSuccess: () => {
          setEditingTrack(null);
          toast({ title: "تم الحفظ", description: "تم تحديث المدحة بنجاح" });
        },
        onError: (err: Error) => {
          toast({ title: "خطأ في الحفظ", description: err.message, variant: "destructive" });
        },
      },
    );
  };

  const handleAddTrack = () => {
    if (!newTrack.title) {
      toast({ title: "خطأ", description: "يجب إدخال اسم المدحة", variant: "destructive" });
      return;
    }
    const tariqaId = tariqas.find((t) => t.name === newTrack.tariqa)?.id || null;
    const fanId = funoon.find((f) => f.name === newTrack.fan)?.id || null;
    const artistName = artists.find((a) => a.id === newTrack.artistId)?.name || "";

    createMadhaMutation.mutate(
      {
        title: newTrack.title,
        madih_name: artistName,
        madih_id: newTrack.artistId || null,
        rawi_id: newTrack.narratorId || null,
        tariqa_id: tariqaId,
        fan_id: fanId,
        lyrics: newTrack.lyrics || null,
        recording_place: newTrack.location || null,
        duration_seconds: parseDuration(newTrack.duration),
        audio_url: newTrack.audioUrl || null,
        image_url: newTrack.imageUrl || null,
        content_type: (newTrack as any).contentType || "madha",
        thumbnail_url: (newTrack as any).thumbnailUrl || null,
      },
      {
        onSuccess: (madhaId: string) => {
          const title = newTrack.title;
          setNewTrack({});
          clearDraft();
          setIsAddDialogOpen(false);
          toast({ title: "تمت الإضافة", description: `تمت إضافة "${title}" بنجاح — ID: ${madhaId.slice(0, 8)}` });
        },
        onError: (err: Error) => {
          toast({ title: "خطأ في الإضافة", description: err.message, variant: "destructive" });
        },
      },
    );
  };

  const handleDeleteSelected = () => setDeleteConfirm({ type: "tracks" });

  const confirmDelete = () => {
    if (!deleteConfirm) return;

    if (deleteConfirm.type === "tracks") {
      const count = selectedTracks.size;
      deleteMadhaatMutation.mutate(Array.from(selectedTracks), {
        onSuccess: () => {
          setSelectedTracks(new Set());
          setDeleteConfirm(null);
          toast({ title: "تم الحذف", description: `تم حذف ${count} ${sectionLabels?.singular || "محتوى"} بنجاح` });
        },
        onError: (err: Error) => {
          toast({ title: "خطأ في الحذف", description: err.message, variant: "destructive" });
        },
      });
    } else if (deleteConfirm.type === "madiheen") {
      const count = selectedMadiheen.size;
      deleteMadiheenMutation.mutate(Array.from(selectedMadiheen), {
        onSuccess: () => {
          setSelectedMadiheen(new Set());
          setDeleteConfirm(null);
          toast({ title: "تم الحذف", description: `تم حذف ${count} مادح بنجاح` });
        },
        onError: (err: Error) => {
          toast({ title: "خطأ", description: err.message, variant: "destructive" });
        },
      });
    } else if (deleteConfirm.type === "ruwat") {
      const count = selectedRuwat.size;
      deleteRuwatMutation.mutate(Array.from(selectedRuwat), {
        onSuccess: () => {
          setSelectedRuwat(new Set());
          setDeleteConfirm(null);
          toast({ title: "تم الحذف", description: `تم حذف ${count} راوي بنجاح` });
        },
        onError: (err: Error) => {
          toast({ title: "خطأ", description: err.message, variant: "destructive" });
        },
      });
    }
  };

  const getDeleteDescription = () => {
    if (!deleteConfirm) return { title: "", desc: "" };

    if (deleteConfirm.type === "tracks") {
      const count = selectedTracks.size;
      return {
        title: `حذف ${count} ${sectionLabels?.singular || "محتوى"}`,
        desc: `سيتم حذف ${count} ${sectionLabels?.singular || "محتوى"} نهائيًا. سيتم أيضًا إزالتها من المفضلة وقوائم التشغيل وسجل الاستماع.`,
      };
    }

    if (deleteConfirm.type === "madiheen") {
      const count = selectedMadiheen.size;
      const affectedTracks = (fetchedTracks || []).filter(
        (t) => t.madih_id && selectedMadiheen.has(t.madih_id),
      ).length;
      const names = artists.filter((a) => selectedMadiheen.has(a.id)).map((a) => a.name).slice(0, 3);
      const nameStr = names.join("، ") + (count > 3 ? ` و${count - 3} آخرين` : "");
      return {
        title: `حذف ${count} مادح`,
        desc: `سيتم حذف: ${nameStr}.${
          affectedTracks > 0 ? ` سيفقد ${affectedTracks} مدحة ارتباطها بالمادح (لن تُحذف المدحات).` : ""
        }`,
      };
    }

    if (deleteConfirm.type === "ruwat") {
      const count = selectedRuwat.size;
      const affectedTracks = (fetchedTracks || []).filter(
        (t) => t.rawi_id && selectedRuwat.has(t.rawi_id),
      ).length;
      const names = narrators.filter((n) => selectedRuwat.has(n.id)).map((n) => n.name).slice(0, 3);
      const nameStr = names.join("، ") + (count > 3 ? ` و${count - 3} آخرين` : "");
      return {
        title: `حذف ${count} راوي`,
        desc: `سيتم حذف: ${nameStr}.${
          affectedTracks > 0 ? ` سيفقد ${affectedTracks} مدحة ارتباطها بالراوي (لن تُحذف المدحات).` : ""
        }`,
      };
    }

    return { title: "", desc: "" };
  };

  const handleEditChange = useCallback(
    (trackId: string, field: keyof MadhaInsert, value: string | null) => {
      setPendingEdits((prev) => {
        const next = new Map(prev);
        if (value === null) {
          const existing = next.get(trackId);
          if (existing) {
            const { [field]: _, ...rest } = existing;
            if (Object.keys(rest).length === 0) {
              next.delete(trackId);
            } else {
              next.set(trackId, rest);
            }
          }
        } else {
          const existing = next.get(trackId) || {};
          next.set(trackId, { ...existing, [field]: value });
        }
        return next;
      });
    },
    [setPendingEdits],
  );

  const handleBatchSave = useCallback(
    (updates: { id: string; changes: Partial<MadhaInsert> }[]) => {
      const count = updates.length;
      batchUpdateMutation.mutate(updates, {
        onSuccess: () => {
          setIsEditMode(false);
          setPendingEdits(new Map());
          setSelectedTracks(new Set());
          toast({ title: "تم الحفظ", description: `تم تحديث ${count} مدحة بنجاح` });
        },
        onError: (err: Error) => {
          toast({ title: "خطأ في الحفظ", description: err.message, variant: "destructive" });
        },
      });
    },
    [batchUpdateMutation, setIsEditMode, setPendingEdits, setSelectedTracks, toast],
  );

  const handleInlineEditSave = useCallback(() => {
    const updates = Array.from(pendingEdits.entries()).map(([id, changes]) => ({ id, changes }));
    if (updates.length === 0) return;
    handleBatchSave(updates);
  }, [pendingEdits, handleBatchSave]);

  const handleCancelEditMode = useCallback(() => {
    if (pendingEdits.size > 0) {
      if (!window.confirm("لديك تعديلات غير محفوظة. هل تريد الإلغاء؟")) return;
    }
    setIsEditMode(false);
    setPendingEdits(new Map());
  }, [pendingEdits, setIsEditMode, setPendingEdits]);

  useEffect(() => {
    if (!isEditMode) return;
    const handler = () => handleCancelEditMode();
    window.addEventListener("inline-edit-escape", handler);
    return () => window.removeEventListener("inline-edit-escape", handler);
  }, [isEditMode, handleCancelEditMode]);

  const handleBulkUpdate = (field: string, value: string) => {
    let dbField: keyof MadhaInsert | null = null;
    let dbValue: any = value;

    if (field === "artistId") dbField = "madih_id";
    else if (field === "narratorId") dbField = "rawi_id";
    else if (field === "tariqa") {
      dbField = "tariqa_id";
      dbValue = tariqas.find((t) => t.name === value)?.id || null;
    } else if (field === "fan") {
      dbField = "fan_id";
      dbValue = funoon.find((f) => f.name === value)?.id || null;
    } else if (field === "contentType") {
      dbField = "content_type";
      dbValue = value;
    }

    if (!dbField) return;

    const count = selectedTracks.size;
    bulkUpdateMadhaatMutation.mutate(
      { ids: Array.from(selectedTracks), field: dbField, value: dbValue },
      {
        onSuccess: () => {
          setBulkEditField(null);
          setSelectedTracks(new Set());
          toast({ title: "تم التحديث", description: `تم تحديث ${count} مدحة بنجاح` });
        },
        onError: (err: Error) => {
          toast({ title: "خطأ في التحديث", description: err.message, variant: "destructive" });
        },
      },
    );
  };

  return {
    handleSaveTrack,
    handleAddTrack,
    handleDeleteSelected,
    confirmDelete,
    getDeleteDescription,
    handleEditChange,
    handleBatchSave,
    handleInlineEditSave,
    handleCancelEditMode,
    handleBulkUpdate,
  };
}
