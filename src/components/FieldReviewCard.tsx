import { FIELD_LABELS } from "../lib/constants";
import type { DraftField, FieldKey } from "../types";

type FieldReviewCardProps = {
  field: DraftField;
  selected: boolean;
  editing: boolean;
  busy: boolean;
  onSelect: () => void;
  onApprove: () => void;
  onToggleEdit: () => void;
  onChangeValue: (value: string) => void;
  onRegenerate: () => void;
};

export function FieldReviewCard({
  field,
  selected,
  editing,
  busy,
  onSelect,
  onApprove,
  onToggleEdit,
  onChangeValue,
  onRegenerate,
}: FieldReviewCardProps) {
  const confidence = typeof field.confidence === "number" ? Math.round(field.confidence * 100) : null;
  const primarySnippet = field.snippets[0];

  return (
    <article className={`field-card${selected ? " is-selected" : ""}`} onClick={onSelect}>
      <div className="field-card__head">
        <div>
          <h3 className="field-card__title">{FIELD_LABELS[field.key as FieldKey]}</h3>
        </div>
        <div className="field-card__meta">
          <span className={`status-badge status-${field.status}`}>{capitalize(field.status)}</span>
          {confidence !== null ? (
            <span className="confidence-badge">{confidence}% grounded</span>
          ) : null}
        </div>
      </div>

      <div className="field-card__body">
        {editing ? (
          <textarea
            className="field-card__editor"
            onChange={(event) => onChangeValue(event.target.value)}
            onClick={(event) => event.stopPropagation()}
            value={field.value}
          />
        ) : (
          <p className={`field-card__value${field.value ? "" : " is-empty"}`}>
            {field.value || "No reliable draft generated yet."}
          </p>
        )}

        <div className="field-card__snippet">
          <span className="field-card__snippet-label">Primary support</span>
          {primarySnippet ? primarySnippet.text : "No snippet available for this field."}
        </div>
      </div>

      <div className="field-card__actions" onClick={(event) => event.stopPropagation()}>
        <button
          className="button button-primary"
          disabled={field.status === "approved"}
          onClick={onApprove}
          type="button"
        >
          Approve
        </button>
        <button className="button button-secondary" onClick={onToggleEdit} type="button">
          {editing ? "Done" : "Edit"}
        </button>
        <button className="button button-ghost" disabled={busy} onClick={onRegenerate} type="button">
          {busy ? "Refreshing..." : "Regenerate"}
        </button>
      </div>
    </article>
  );
}

function capitalize(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
