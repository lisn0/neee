import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  EasyFevirApiError,
  FIELD_ORDER,
  type DraftField,
  type FieldKey,
} from "../shared/easy-fevir-engine";
import type {
  DraftFieldsState,
  DraftSnapshot,
  DraftSummary,
  PersistedDraft,
  SaveDraftRequest,
} from "../shared/easy-fevir-drafts";

const DATA_DIR = path.resolve(process.cwd(), process.env.EASY_FEVIR_DATA_DIR ?? "data");
const DATA_FILE = path.join(DATA_DIR, "drafts.json");

type DraftStoreFile = {
  drafts: PersistedDraft[];
};

export async function saveDraft(request: SaveDraftRequest): Promise<PersistedDraft> {
  validateSnapshot(request.snapshot);

  const store = await readStore();
  const now = new Date().toISOString();
  const draftId = request.draft_id?.trim() || makeDraftId();
  const name = deriveDraftName(request.name, request.snapshot);
  const nextDraft: PersistedDraft = {
    draft_id: draftId,
    name,
    created_at: now,
    updated_at: now,
    snapshot: request.snapshot,
  };

  const existingIndex = store.drafts.findIndex((draft) => draft.draft_id === draftId);
  if (existingIndex >= 0) {
    nextDraft.created_at = store.drafts[existingIndex]!.created_at;
    store.drafts[existingIndex] = nextDraft;
  } else {
    store.drafts.unshift(nextDraft);
  }

  store.drafts.sort((left, right) => right.updated_at.localeCompare(left.updated_at));
  await writeStore(store);
  return nextDraft;
}

export async function getLatestDraft(): Promise<PersistedDraft | null> {
  const store = await readStore();
  return store.drafts[0] ?? null;
}

export async function getDraftById(draftId: string): Promise<PersistedDraft | null> {
  const store = await readStore();
  return store.drafts.find((draft) => draft.draft_id === draftId) ?? null;
}

export async function listDrafts(limit = 10): Promise<DraftSummary[]> {
  const store = await readStore();
  return store.drafts.slice(0, Math.max(1, limit)).map(buildDraftSummary);
}

export function buildDraftSummary(draft: PersistedDraft): DraftSummary {
  const fields = Object.values(draft.snapshot.fields);
  const approvedCount = fields.filter((field) => field?.status === "approved").length;

  return {
    draft_id: draft.draft_id,
    name: draft.name,
    source_title: draft.snapshot.source.title?.trim() || "Untitled source",
    updated_at: draft.updated_at,
    approved_field_count: approvedCount,
    total_field_count: FIELD_ORDER.length,
  };
}

async function readStore(): Promise<DraftStoreFile> {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as DraftStoreFile;
    return {
      drafts: Array.isArray(parsed.drafts) ? parsed.drafts : [],
    };
  } catch (error) {
    if (isMissingFileError(error)) {
      return { drafts: [] };
    }

    throw error;
  }
}

async function writeStore(store: DraftStoreFile): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
}

function validateSnapshot(snapshot: DraftSnapshot | undefined): asserts snapshot is DraftSnapshot {
  if (!snapshot) {
    throw new EasyFevirApiError({
      code: "INVALID_REQUEST",
      message: "snapshot is required",
      status: 400,
      details: [{ field: "snapshot", message: "Must be provided" }],
    });
  }

  if (!snapshot.source?.text?.trim()) {
    throw new EasyFevirApiError({
      code: "INVALID_REQUEST",
      message: "snapshot.source.text is required",
      status: 400,
      details: [{ field: "snapshot.source.text", message: "Must not be empty" }],
    });
  }

  validateFields(snapshot.fields);
}

function validateFields(fields: DraftFieldsState | undefined): void {
  if (!fields || typeof fields !== "object") {
    throw new EasyFevirApiError({
      code: "INVALID_REQUEST",
      message: "snapshot.fields is required",
      status: 400,
      details: [{ field: "snapshot.fields", message: "Must be an object keyed by field id" }],
    });
  }

  for (const [fieldKey, field] of Object.entries(fields)) {
    if (!FIELD_ORDER.includes(fieldKey as FieldKey)) {
      throw new EasyFevirApiError({
        code: "INVALID_REQUEST",
        message: `Unsupported field key: ${fieldKey}`,
        status: 400,
        details: [{ field: `snapshot.fields.${fieldKey}`, message: "Must be a supported field key" }],
      });
    }

    validateField(fieldKey as FieldKey, field);
  }
}

function validateField(fieldKey: FieldKey, field: DraftField | undefined): void {
  if (!field) {
    throw new EasyFevirApiError({
      code: "INVALID_REQUEST",
      message: `Field payload missing for ${fieldKey}`,
      status: 400,
      details: [{ field: `snapshot.fields.${fieldKey}`, message: "Must be a field object" }],
    });
  }

  if (field.key !== fieldKey) {
    throw new EasyFevirApiError({
      code: "INVALID_REQUEST",
      message: `Field key mismatch for ${fieldKey}`,
      status: 400,
      details: [{ field: `snapshot.fields.${fieldKey}.key`, message: "Must match the object key" }],
    });
  }
}

function deriveDraftName(name: string | undefined, snapshot: DraftSnapshot): string {
  const explicitName = name?.trim();
  if (explicitName) {
    return explicitName;
  }

  const recommendationTitle = snapshot.fields.title?.value?.trim();
  if (recommendationTitle) {
    return recommendationTitle;
  }

  const sourceTitle = snapshot.source.title?.trim();
  if (sourceTitle) {
    return sourceTitle;
  }

  return "Untitled draft";
}

function makeDraftId(): string {
  return `draft_${Math.random().toString(36).slice(2, 10)}`;
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
