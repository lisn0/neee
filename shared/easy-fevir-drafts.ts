import type {
  DraftField,
  FieldKey,
  SourceInput,
  WarningItem,
} from "./easy-fevir-engine";

export type DraftFieldsState = Partial<Record<FieldKey, DraftField>>;

export type DraftSnapshot = {
  source: SourceInput;
  fields: DraftFieldsState;
  warnings: WarningItem[];
  selected_field_key: FieldKey | null;
};

export type SaveDraftRequest = {
  draft_id?: string;
  name?: string;
  snapshot: DraftSnapshot;
};

export type PersistedDraft = {
  draft_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  snapshot: DraftSnapshot;
};

export type DraftSummary = {
  draft_id: string;
  name: string;
  source_title: string;
  updated_at: string;
  approved_field_count: number;
  total_field_count: number;
};

export type SaveDraftResponse = {
  draft: PersistedDraft;
  summary: DraftSummary;
};

export type GetDraftResponse = {
  draft: PersistedDraft;
};

export type ListDraftsResponse = {
  drafts: DraftSummary[];
};
