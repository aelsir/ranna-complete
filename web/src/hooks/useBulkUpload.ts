import { useReducer, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { uploadToR2 } from "@/lib/upload";
import { createMadha } from "@/lib/api/queries";
import { queryKeys } from "@/lib/api/hooks";

// ── Types ──────────────────────────────────────────────

export type FileStatus = "queued" | "uploading" | "saving" | "completed" | "failed";

export interface FileMetadataOverrides {
  madihId?: string;
  madihName?: string;
  rawiId?: string;
  tariqaId?: string;
  fanId?: string;
  recordingPlace?: string;
  lyrics?: string;
}

export interface BulkFile {
  id: string;
  file: File;
  title: string;
  originalFilename: string;
  status: FileStatus;
  durationSeconds: number | null;
  audioUrl: string | null;
  madhaId: string | null;
  error: string | null;
  overrides: FileMetadataOverrides;
}

export interface SharedMetadata {
  madihId: string;
  madihName: string;
  rawiId: string;
  tariqaId: string;
  fanId: string;
  recordingPlace: string;
  lyrics: string;
  contentType: string;
}

interface BulkUploadState {
  files: BulkFile[];
  metadata: SharedMetadata;
  phase: "selection" | "uploading" | "completed";
  cancelled: boolean;
}

// ── Actions ────────────────────────────────────────────

type Action =
  | { type: "ADD_FILES"; files: BulkFile[] }
  | { type: "REMOVE_FILE"; id: string }
  | { type: "UPDATE_TITLE"; id: string; title: string }
  | { type: "SET_METADATA"; metadata: Partial<SharedMetadata> }
  | { type: "SET_FILE_OVERRIDE"; id: string; overrides: Partial<FileMetadataOverrides> }
  | { type: "CLEAR_FILE_OVERRIDES"; id: string }
  | { type: "APPLY_SHARED_TO_ALL" }
  | { type: "START_UPLOAD" }
  | { type: "FILE_UPLOADING"; id: string }
  | { type: "FILE_SAVING"; id: string; audioUrl: string }
  | { type: "FILE_COMPLETED"; id: string; madhaId: string }
  | { type: "FILE_FAILED"; id: string; error: string }
  | { type: "CANCEL" }
  | { type: "RETRY_FAILED" }
  | { type: "RESET" };

const STORAGE_KEY = "ranna_bulk_upload_metadata";

const initialMetadata: SharedMetadata = {
  madihId: "",
  madihName: "",
  rawiId: "",
  tariqaId: "",
  fanId: "",
  recordingPlace: "",
  lyrics: "",
  contentType: "madha",
};

function loadSavedMetadata(): SharedMetadata {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...initialMetadata, ...JSON.parse(saved) };
  } catch { /* ignore */ }
  return initialMetadata;
}

function saveMetadata(metadata: SharedMetadata) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(metadata));
  } catch { /* ignore */ }
}

function clearSavedMetadata() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}

const initialState: BulkUploadState = {
  files: [],
  metadata: loadSavedMetadata(),
  phase: "selection",
  cancelled: false,
};

// ── Reducer ────────────────────────────────────────────

function reducer(state: BulkUploadState, action: Action): BulkUploadState {
  switch (action.type) {
    case "ADD_FILES":
      return { ...state, files: [...state.files, ...action.files] };

    case "REMOVE_FILE":
      return { ...state, files: state.files.filter((f) => f.id !== action.id) };

    case "UPDATE_TITLE":
      return {
        ...state,
        files: state.files.map((f) =>
          f.id === action.id ? { ...f, title: action.title } : f
        ),
      };

    case "SET_METADATA": {
      const newMetadata = { ...state.metadata, ...action.metadata };
      saveMetadata(newMetadata);
      return { ...state, metadata: newMetadata };
    }

    case "SET_FILE_OVERRIDE": {
      return {
        ...state,
        files: state.files.map((f) => {
          if (f.id !== action.id) return f;
          const newOverrides = { ...f.overrides };
          for (const [key, value] of Object.entries(action.overrides)) {
            if (value === undefined || value === "") {
              delete newOverrides[key as keyof FileMetadataOverrides];
            } else {
              (newOverrides as any)[key] = value;
            }
          }
          return { ...f, overrides: newOverrides };
        }),
      };
    }

    case "CLEAR_FILE_OVERRIDES":
      return {
        ...state,
        files: state.files.map((f) =>
          f.id === action.id ? { ...f, overrides: {} } : f
        ),
      };

    case "APPLY_SHARED_TO_ALL":
      return {
        ...state,
        files: state.files.map((f) => ({ ...f, overrides: {} })),
      };

    case "START_UPLOAD":
      return { ...state, phase: "uploading", cancelled: false };

    case "FILE_UPLOADING":
      return {
        ...state,
        files: state.files.map((f) =>
          f.id === action.id ? { ...f, status: "uploading" as const, error: null } : f
        ),
      };

    case "FILE_SAVING":
      return {
        ...state,
        files: state.files.map((f) =>
          f.id === action.id ? { ...f, status: "saving" as const, audioUrl: action.audioUrl } : f
        ),
      };

    case "FILE_COMPLETED":
      return {
        ...state,
        files: state.files.map((f) =>
          f.id === action.id ? { ...f, status: "completed" as const, madhaId: action.madhaId } : f
        ),
      };

    case "FILE_FAILED":
      return {
        ...state,
        files: state.files.map((f) =>
          f.id === action.id ? { ...f, status: "failed" as const, error: action.error } : f
        ),
      };

    case "CANCEL":
      return { ...state, cancelled: true };

    case "RETRY_FAILED":
      return {
        ...state,
        phase: "uploading",
        cancelled: false,
        files: state.files.map((f) =>
          f.status === "failed" ? { ...f, status: "queued" as const, error: null } : f
        ),
      };

    case "RESET":
      clearSavedMetadata();
      return { ...initialState, metadata: initialMetadata };

    default:
      return state;
  }
}

// ── Helpers ────────────────────────────────────────────

const ACCEPTED_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
  "audio/m4a",
  "audio/x-wav",
];

function deriveTitle(filename: string): string {
  // Strip extension
  let name = filename.replace(/\.[^.]+$/, "");
  // Strip leading numbering patterns like "01 - ", "1.", "01_", etc.
  name = name.replace(/^\d+[\s._-]+/, "");
  return name.trim() || filename;
}

function getAudioDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);
    audio.src = url;
    audio.addEventListener("loadedmetadata", () => {
      const dur = isFinite(audio.duration) ? Math.round(audio.duration) : null;
      URL.revokeObjectURL(url);
      resolve(dur);
    });
    audio.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      resolve(null);
    });
  });
}

/** Merge shared defaults with per-file overrides (overrides win). */
function getEffectiveMetadata(
  shared: SharedMetadata,
  overrides: FileMetadataOverrides
) {
  return {
    madihId: overrides.madihId ?? shared.madihId,
    madihName: overrides.madihName ?? shared.madihName,
    rawiId: overrides.rawiId ?? shared.rawiId,
    tariqaId: overrides.tariqaId ?? shared.tariqaId,
    fanId: overrides.fanId ?? shared.fanId,
    recordingPlace: overrides.recordingPlace ?? shared.recordingPlace,
    lyrics: overrides.lyrics ?? shared.lyrics,
    contentType: shared.contentType,
  };
}

// ── Hook ───────────────────────────────────────────────

export function useBulkUpload() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const cancelledRef = useRef(false);
  const queryClient = useQueryClient();

  const addFiles = useCallback(async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    const toAdd = files.filter((f) => ACCEPTED_TYPES.includes(f.type));

    const bulkFiles: BulkFile[] = await Promise.all(
      toAdd.map(async (file) => ({
        id: crypto.randomUUID(),
        file,
        title: deriveTitle(file.name),
        originalFilename: file.name,
        status: "queued" as const,
        durationSeconds: await getAudioDuration(file),
        audioUrl: null,
        madhaId: null,
        error: null,
        overrides: {},
      }))
    );

    if (bulkFiles.length > 0) {
      dispatch({ type: "ADD_FILES", files: bulkFiles });
    }

    return {
      added: bulkFiles.length,
      rejected: files.length - bulkFiles.length,
    };
  }, [state.files.length]);

  const removeFile = useCallback((id: string) => {
    dispatch({ type: "REMOVE_FILE", id });
  }, []);

  const updateTitle = useCallback((id: string, title: string) => {
    dispatch({ type: "UPDATE_TITLE", id, title });
  }, []);

  const setMetadata = useCallback((metadata: Partial<SharedMetadata>) => {
    dispatch({ type: "SET_METADATA", metadata });
  }, []);

  const setFileOverride = useCallback(
    (id: string, overrides: Partial<FileMetadataOverrides>) => {
      dispatch({ type: "SET_FILE_OVERRIDE", id, overrides });
    },
    []
  );

  const clearFileOverrides = useCallback((id: string) => {
    dispatch({ type: "CLEAR_FILE_OVERRIDES", id });
  }, []);

  const applySharedToAll = useCallback(() => {
    dispatch({ type: "APPLY_SHARED_TO_ALL" });
  }, []);

  const startUpload = useCallback(async () => {
    dispatch({ type: "START_UPLOAD" });
    cancelledRef.current = false;

    const queued = state.files.filter((f) => f.status === "queued");

    for (const file of queued) {
      if (cancelledRef.current) break;

      dispatch({ type: "FILE_UPLOADING", id: file.id });

      try {
        // 1. Upload audio to R2
        let audioPath: string;
        try {
          const uploadResult = await uploadToR2(file.file, "audio/madhaat");
          audioPath = uploadResult.path;
        } catch (uploadErr) {
          const msg = uploadErr instanceof Error ? uploadErr.message : String(uploadErr);
          console.error(`[رفع R2] فشل "${file.title}":`, uploadErr);
          throw new Error(`خطأ رفع الملف: ${msg}`);
        }

        if (cancelledRef.current) break;

        dispatch({ type: "FILE_SAVING", id: file.id, audioUrl: audioPath });

        // Merge shared defaults with per-file overrides
        const effective = getEffectiveMetadata(state.metadata, file.overrides);

        // 2. Create DB record
        let madhaId: string;
        try {
          madhaId = await createMadha({
            title: file.title,
            madih_name: effective.madihName,
            madih_id: effective.madihId || null,
            rawi_id: effective.rawiId || null,
            tariqa_id: effective.tariqaId || null,
            fan_id: effective.fanId || null,
            recording_place: effective.recordingPlace || null,
            lyrics: effective.lyrics || null,
            duration_seconds: file.durationSeconds,
            audio_url: audioPath,
            content_type: (effective.contentType || "madha") as any,
          });
        } catch (dbErr: any) {
          const parts = [dbErr?.message, dbErr?.details, dbErr?.hint].filter(Boolean);
          const msg = parts.length > 0 ? parts.join(" — ") : String(dbErr);
          console.error(`[حفظ DB] فشل "${file.title}":`, dbErr);
          throw new Error(`خطأ حفظ البيانات: ${msg}`);
        }

        dispatch({ type: "FILE_COMPLETED", id: file.id, madhaId });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "فشل الرفع — خطأ غير معروف";
        console.error(`[رفع] فشل "${file.title}":`, err);
        dispatch({
          type: "FILE_FAILED",
          id: file.id,
          error: errorMsg,
        });
      }
    }

    // Invalidate caches
    queryClient.invalidateQueries({ queryKey: queryKeys.madhaat });
    queryClient.invalidateQueries({ queryKey: queryKeys.homePageData });
  }, [state.files, state.metadata, queryClient]);

  const cancelUpload = useCallback(() => {
    cancelledRef.current = true;
    dispatch({ type: "CANCEL" });
  }, []);

  const retryFailed = useCallback(() => {
    dispatch({ type: "RETRY_FAILED" });
  }, []);

  const reset = useCallback(() => {
    cancelledRef.current = false;
    dispatch({ type: "RESET" });
  }, []);

  // Derived state
  const completedCount = state.files.filter((f) => f.status === "completed").length;
  const failedCount = state.files.filter((f) => f.status === "failed").length;
  const totalCount = state.files.length;
  const isUploading = state.phase === "uploading" && !state.cancelled &&
    state.files.some((f) => f.status === "uploading" || f.status === "saving");
  const isComplete = state.phase === "uploading" &&
    state.files.every((f) => f.status === "completed" || f.status === "failed");

  return {
    files: state.files,
    metadata: state.metadata,
    phase: state.phase,
    cancelled: state.cancelled,
    completedCount,
    failedCount,
    totalCount,
    isUploading,
    isComplete,
    addFiles,
    removeFile,
    updateTitle,
    setMetadata,
    setFileOverride,
    clearFileOverrides,
    applySharedToAll,
    startUpload,
    cancelUpload,
    retryFailed,
    reset,
  };
}
