import type { MadhaInsert } from "./database";

/** Map of trackId → partial field changes for all pending inline edits */
export type PendingEdits = Map<string, Partial<MadhaInsert>>;

/** Fields that can be edited inline or via find-replace */
export type EditableField = "title" | "madih_id" | "rawi_id" | "tariqa_id" | "fan_id";

/** A single find-replace match shown in the preview list */
export interface FindReplaceMatch {
  trackId: string;
  trackTitle: string;
  currentValue: string;
  newValue: string;
  included: boolean;
}
