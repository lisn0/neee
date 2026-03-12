import { startTransition, useEffect, useState } from "react";
import {
  type FieldKey,
} from "../shared/easy-fevir-engine";
import type { DraftSummary } from "../shared/easy-fevir-drafts";
import { AppHeader } from "./components/AppHeader";
import { FieldReviewPanel } from "./components/FieldReviewPanel";
import { MobileTabs } from "./components/MobileTabs";
import { RecommendationDraftPanel } from "./components/RecommendationDraftPanel";
import { SourcePanel } from "./components/SourcePanel";
import { ApiClientError, extractDraftViaApi, regenerateFieldViaApi } from "./lib/api";
import {
  listDraftsViaApi,
  loadLatestDraftViaApi,
  saveDraftViaApi,
} from "./lib/draftApi";
import { ToastRegion } from "./components/ToastRegion";
import { DEMO_SOURCE, FIELD_LABELS, FIELD_ORDER } from "./lib/constants";
import { buildExportPayload, downloadExportPayload } from "./lib/exportDraft";
import type { AppFieldsState, SourceInput, WarningItem } from "./types";

type ToastMessage = {
  id: number;
  text: string;
};

const EMPTY_SOURCE: SourceInput = {
  type: "text_excerpt",
  title: "",
  source_id: "",
  text: "",
};

export default function App() {
  const [source, setSource] = useState<SourceInput>(DEMO_SOURCE);
  const [fields, setFields] = useState<AppFieldsState>({});
  const [warnings, setWarnings] = useState<WarningItem[]>([]);
  const [selectedFieldKey, setSelectedFieldKey] = useState<FieldKey | null>(null);
  const [editingFieldKeys, setEditingFieldKeys] = useState<Set<FieldKey>>(new Set());
  const [isExtracting, setIsExtracting] = useState(false);
  const [regeneratingFieldKey, setRegeneratingFieldKey] = useState<FieldKey | null>(null);
  const [extractError, setExtractError] = useState("");
  const [mobileTab, setMobileTab] = useState<"source" | "fields" | "draft">("source");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftSummaries, setDraftSummaries] = useState<DraftSummary[]>([]);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);

  const canExport = FIELD_ORDER.some((key) => fields[key]);
  const canSaveDraft = Boolean(source.text.trim()) || canExport;
  const canLoadDraft = draftSummaries.length > 0;
  const approvedCount = FIELD_ORDER.filter((key) => fields[key]?.status === "approved").length;

  let statusLabel = "No draft yet";
  if (isExtracting) {
    statusLabel = "Extracting draft";
  } else if (isSavingDraft) {
    statusLabel = "Saving draft";
  } else if (isLoadingDraft) {
    statusLabel = "Loading draft";
  } else if (regeneratingFieldKey) {
    statusLabel = `Refreshing ${FIELD_LABELS[regeneratingFieldKey]}`;
  } else if (canExport) {
    statusLabel = `${approvedCount}/${FIELD_ORDER.length} approved`;
  } else if (source.text.trim()) {
    statusLabel = "Source ready";
  }

  const selectedSnippet = selectedFieldKey ? fields[selectedFieldKey]?.snippets[0] : undefined;
  const isBusy = isExtracting || regeneratingFieldKey !== null || isSavingDraft || isLoadingDraft;

  useEffect(() => {
    void refreshDraftSummaries();
  }, []);

  async function handleExtract() {
    setExtractError("");
    setWarnings([]);
    setEditingFieldKeys(new Set());
    setIsExtracting(true);

    try {
      const response = await extractDraftViaApi({
        source,
        options: {
          include_confidence: true,
          max_snippets_per_field: 3,
        },
      });

      startTransition(() => {
        setFields(Object.fromEntries(response.fields.map((field) => [field.key, field])));
        setWarnings(response.warnings);
        setSelectedFieldKey(response.fields[0]?.key ?? null);
        setMobileTab("fields");
      });

      pushToast("Draft extracted");
    } catch (error) {
      setExtractError(buildErrorMessage(error));
      pushToast("Extraction failed");
    } finally {
      setIsExtracting(false);
    }
  }

  async function handleRegenerateField(fieldKey: FieldKey) {
    setRegeneratingFieldKey(fieldKey);
    setExtractError("");

    try {
      const response = await regenerateFieldViaApi({
        source,
        target_field: fieldKey,
        current_fields: FIELD_ORDER.filter((key) => fields[key]).map((key) => ({
          key,
          value: fields[key]!.value,
          status: fields[key]!.status,
        })),
        options: {
          include_confidence: true,
          max_snippets_per_field: 3,
        },
      });

      startTransition(() => {
        setFields((current) => ({
          ...current,
          [fieldKey]: response.field,
        }));
        setWarnings((current) => mergeWarnings(current, response.warnings, fieldKey));
        setSelectedFieldKey(fieldKey);
      });

      pushToast(`${FIELD_LABELS[fieldKey]} refreshed`);
    } catch (error) {
      setExtractError(buildErrorMessage(error));
      pushToast("Field refresh failed");
    } finally {
      setRegeneratingFieldKey(null);
    }
  }

  function handleApproveField(fieldKey: FieldKey) {
    setFields((current) => ({
      ...current,
      [fieldKey]: current[fieldKey]
        ? {
            ...current[fieldKey],
            status: "approved",
          }
        : current[fieldKey],
    }));
    setEditingFieldKeys((current) => {
      const next = new Set(current);
      next.delete(fieldKey);
      return next;
    });
    setSelectedFieldKey(fieldKey);
    pushToast(`${FIELD_LABELS[fieldKey]} approved`);
  }

  function handleToggleEditField(fieldKey: FieldKey) {
    setEditingFieldKeys((current) => {
      const next = new Set(current);
      if (next.has(fieldKey)) {
        next.delete(fieldKey);
      } else {
        next.add(fieldKey);
      }
      return next;
    });
    setSelectedFieldKey(fieldKey);
  }

  function handleChangeFieldValue(fieldKey: FieldKey, value: string) {
    setFields((current) => ({
      ...current,
      [fieldKey]: current[fieldKey]
        ? {
            ...current[fieldKey],
            value,
            status: "edited",
          }
        : current[fieldKey],
    }));
  }

  function handleExport() {
    if (!canExport) {
      return;
    }

    downloadExportPayload(buildExportPayload(source, fields));
    pushToast("Draft exported");
  }

  async function handleSaveDraft() {
    setIsSavingDraft(true);

    try {
      const response = await saveDraftViaApi({
        draft_id: draftId ?? undefined,
        snapshot: {
          source,
          fields,
          warnings,
          selected_field_key: selectedFieldKey,
        },
      });

      setDraftId(response.draft.draft_id);
      await refreshDraftSummaries();
      pushToast("Draft saved");
    } catch (error) {
      setExtractError(buildErrorMessage(error));
      pushToast("Draft save failed");
    } finally {
      setIsSavingDraft(false);
    }
  }

  async function handleLoadDraft() {
    setIsLoadingDraft(true);

    try {
      const response = await loadLatestDraftViaApi();
      const persisted = response.draft;

      setDraftId(persisted.draft_id);
      setSource(persisted.snapshot.source);
      setFields(persisted.snapshot.fields);
      setWarnings(persisted.snapshot.warnings);
      setSelectedFieldKey(persisted.snapshot.selected_field_key);
      setEditingFieldKeys(new Set());
      setExtractError("");
      setMobileTab(Object.keys(persisted.snapshot.fields).length ? "fields" : "source");
      await refreshDraftSummaries();
      pushToast("Latest draft loaded");
    } catch (error) {
      setExtractError(buildErrorMessage(error));
      pushToast("Draft load failed");
    } finally {
      setIsLoadingDraft(false);
    }
  }

  function handleNewDraft() {
    if (
      (source.text.trim() || canExport) &&
      !window.confirm("Reset the current draft and clear all extracted fields?")
    ) {
      return;
    }

    setSource(EMPTY_SOURCE);
    setFields({});
    setWarnings([]);
    setSelectedFieldKey(null);
    setDraftId(null);
    setEditingFieldKeys(new Set());
    setExtractError("");
    setRegeneratingFieldKey(null);
    setMobileTab("source");
    pushToast("Started a new draft");
  }

  function handleClearSource() {
    setSource(EMPTY_SOURCE);
    setExtractError("");
    setSelectedFieldKey(null);
    pushToast("Source cleared");
  }

  function handleLoadDemo() {
    setSource(DEMO_SOURCE);
    setExtractError("");
    pushToast("Loaded PRECLUDE demo source");
  }

  async function refreshDraftSummaries() {
    try {
      const summaries = await listDraftsViaApi(10);
      setDraftSummaries(summaries);
    } catch {
      setDraftSummaries([]);
    }
  }

  function pushToast(text: string) {
    const id = window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 2600);

    setToasts((current) => [...current, { id, text }]);
  }

  return (
    <>
      <div className="canvas-glow" />

      <div className="app-shell">
        <AppHeader
          canExport={canExport}
          canLoadDraft={canLoadDraft}
          canSaveDraft={canSaveDraft}
          onExport={handleExport}
          onLoadDraft={handleLoadDraft}
          onNewDraft={handleNewDraft}
          onSaveDraft={handleSaveDraft}
          statusLabel={statusLabel}
        />

        <MobileTabs activeTab={mobileTab} onChange={setMobileTab} />

        <main className="workspace" data-mobile-tab={mobileTab}>
          <SourcePanel
            isBusy={isBusy}
            onClear={handleClearSource}
            onExtract={handleExtract}
            onLoadDemo={handleLoadDemo}
            onSourceChange={(next) => setSource((current) => ({ ...current, ...next }))}
            selectedSnippet={selectedSnippet}
            source={source}
          />

          <FieldReviewPanel
            editingFieldKeys={editingFieldKeys}
            extractError={extractError}
            fields={fields}
            isExtracting={isExtracting}
            onApproveField={handleApproveField}
            onChangeFieldValue={handleChangeFieldValue}
            onRegenerateField={handleRegenerateField}
            onSelectField={setSelectedFieldKey}
            onToggleEditField={handleToggleEditField}
            regeneratingFieldKey={regeneratingFieldKey}
            selectedFieldKey={selectedFieldKey}
            warnings={warnings}
          />

          <RecommendationDraftPanel canExport={canExport} fields={fields} onExport={handleExport} />
        </main>
      </div>

      <ToastRegion messages={toasts} />
    </>
  );
}

function buildErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.details?.length) {
      return `${error.message}: ${error.details
        .map((detail) => `${detail.field} ${detail.message}`)
        .join(", ")}`;
    }

    return error.message;
  }

  return "Something went wrong while processing the source.";
}

function mergeWarnings(
  currentWarnings: WarningItem[],
  nextWarnings: WarningItem[],
  fieldKey: FieldKey,
): WarningItem[] {
  const retainedWarnings = currentWarnings.filter((warning) => {
    if (fieldKey === "population" && warning.code === "MISSING_POPULATION") {
      return false;
    }

    if (fieldKey === "intervention_comparator" && warning.code === "MISSING_COMPARATOR") {
      return false;
    }

    if (fieldKey === "outcomes" && warning.code === "MISSING_OUTCOMES") {
      return false;
    }

    if (fieldKey === "evidence_summary" && warning.code === "LOW_GROUNDING_CONFIDENCE") {
      return false;
    }

    if (fieldKey === "recommendation_statement" && warning.code === "AMBIGUOUS_RECOMMENDATION_BASIS") {
      return false;
    }

    return true;
  });

  const merged = [...retainedWarnings, ...nextWarnings];
  const seen = new Set<string>();

  return merged.filter((warning) => {
    if (seen.has(warning.code)) {
      return false;
    }

    seen.add(warning.code);
    return true;
  });
}
