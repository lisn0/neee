import { FIELD_ORDER } from "../lib/constants";
import type { AppFieldsState, FieldKey, WarningItem } from "../types";
import { FieldReviewCard } from "./FieldReviewCard";

type FieldReviewPanelProps = {
  fields: AppFieldsState;
  warnings: WarningItem[];
  selectedFieldKey: FieldKey | null;
  editingFieldKeys: Set<FieldKey>;
  isExtracting: boolean;
  regeneratingFieldKey: FieldKey | null;
  extractError: string;
  onSelectField: (fieldKey: FieldKey) => void;
  onApproveField: (fieldKey: FieldKey) => void;
  onToggleEditField: (fieldKey: FieldKey) => void;
  onChangeFieldValue: (fieldKey: FieldKey, value: string) => void;
  onRegenerateField: (fieldKey: FieldKey) => void;
};

export function FieldReviewPanel({
  fields,
  warnings,
  selectedFieldKey,
  editingFieldKeys,
  isExtracting,
  regeneratingFieldKey,
  extractError,
  onSelectField,
  onApproveField,
  onToggleEditField,
  onChangeFieldValue,
  onRegenerateField,
}: FieldReviewPanelProps) {
  const extractedCount = FIELD_ORDER.filter((key) => fields[key]).length;
  const approvedCount = FIELD_ORDER.filter((key) => fields[key]?.status === "approved").length;
  const editedCount = FIELD_ORDER.filter((key) => fields[key]?.status === "edited").length;

  let statusText = "No extracted fields yet. Paste a source and run extraction.";
  if (extractError) {
    statusText = extractError;
  } else if (isExtracting) {
    statusText = "Extracting structured evidence fields...";
  } else if (regeneratingFieldKey) {
    statusText = `Refreshing ${fields[regeneratingFieldKey]?.label ?? "field"}...`;
  } else if (extractedCount > 0) {
    statusText = `${approvedCount} of ${FIELD_ORDER.length} fields approved. ${editedCount} edited.`;
  }

  return (
    <section aria-labelledby="fieldsHeading" className="panel fields-panel" data-panel="fields">
      <div className="panel-head">
        <div>
          <p className="panel-kicker">Review</p>
          <h2 id="fieldsHeading">Structured Fields</h2>
        </div>
        <div className="panel-badge">Panel 2</div>
      </div>

      <div className="status-card">{statusText}</div>

      {warnings.length > 0 ? (
        <div className="warning-list">
          {warnings.map((warning) => (
            <div className="warning-item" key={warning.code}>
              <strong>{formatCode(warning.code)}</strong>
              <br />
              {warning.message}
            </div>
          ))}
        </div>
      ) : null}

      <div className="field-list">
        {extractedCount === 0 ? (
          <div className="empty-state">The extraction cards will appear here after the first pass.</div>
        ) : (
          FIELD_ORDER.map((key) => {
            const field = fields[key];
            if (!field) {
              return null;
            }

            return (
              <FieldReviewCard
                busy={isExtracting || regeneratingFieldKey === key}
                editing={editingFieldKeys.has(key)}
                field={field}
                key={key}
                onApprove={() => onApproveField(key)}
                onChangeValue={(value) => onChangeFieldValue(key, value)}
                onRegenerate={() => onRegenerateField(key)}
                onSelect={() => onSelectField(key)}
                onToggleEdit={() => onToggleEditField(key)}
                selected={selectedFieldKey === key}
              />
            );
          })
        )}
      </div>
    </section>
  );
}

function formatCode(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
