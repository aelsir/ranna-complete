import { useCallback, useEffect, useState } from "react";
import type { ExtendedTrack } from "./dashboard-types";

const DRAFT_KEY = "ranna_draft_track";
const DRAFT_DIALOG_KEY = "ranna_draft_dialog_open";

/**
 * Persists the "new track" draft to localStorage so the form survives
 * accidental reloads. Also warns before browser close while the Add Track
 * dialog is open and has unsaved data.
 */
export function useTrackDraftPersistence(isAddDialogOpen: boolean) {
  const [newTrack, setNewTrackRaw] = useState<Partial<ExtendedTrack>>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      /* ignore */
    }
    return {};
  });

  const setNewTrack = useCallback(
    (value: Partial<ExtendedTrack> | ((prev: Partial<ExtendedTrack>) => Partial<ExtendedTrack>)) => {
      setNewTrackRaw((prev) => {
        const next = typeof value === "function" ? value(prev) : value;
        try {
          if (Object.keys(next).length > 0) {
            localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
          } else {
            localStorage.removeItem(DRAFT_KEY);
          }
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [],
  );

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_KEY);
      localStorage.removeItem(DRAFT_DIALOG_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const hasData = isAddDialogOpen && Object.keys(newTrack).length > 0;
    if (!hasData) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isAddDialogOpen, newTrack]);

  return { newTrack, setNewTrack, clearDraft };
}
