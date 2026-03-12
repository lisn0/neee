import { FIELD_LABELS, FIELD_ORDER } from "../lib/constants";
import type { AppFieldsState } from "../types";

type RecommendationDraftPanelProps = {
  fields: AppFieldsState;
  canExport: boolean;
  onExport: () => void;
};

export function RecommendationDraftPanel({
  fields,
  canExport,
  onExport,
}: RecommendationDraftPanelProps) {
  const approvedCount = FIELD_ORDER.filter((key) => fields[key]?.status === "approved").length;
  const editedCount = FIELD_ORDER.filter((key) => fields[key]?.status === "edited").length;
  const pendingCount = FIELD_ORDER.length - approvedCount - editedCount;
  const hasFields = FIELD_ORDER.some((key) => fields[key]);

  return (
    <section aria-labelledby="draftHeading" className="panel draft-panel" data-panel="draft">
      <div className="panel-head">
        <div>
          <p className="panel-kicker">Assemble</p>
          <h2 id="draftHeading">Recommendation Draft</h2>
        </div>
        <div className="panel-badge">Panel 3</div>
      </div>

      <div className="draft-summary">
        {approvedCount} approved / {editedCount} edited / {pendingCount} pending
      </div>

      <div className="draft-sections">
        {!hasFields ? (
          <div className="empty-state">
            Your assembled recommendation will appear here as soon as fields are extracted.
          </div>
        ) : (
          FIELD_ORDER.map((key) => {
            const field = fields[key];
            const value = field?.value?.trim() || "Not reviewed yet";
            const status = field?.status ?? "draft";

            return (
              <section className="draft-card" key={key}>
                <div className="draft-section__head">
                  <h3 className="draft-section__title">{FIELD_LABELS[key]}</h3>
                  <span className={`status-badge status-${status}`}>{capitalize(status)}</span>
                </div>
                <p className={`draft-section__value${value === "Not reviewed yet" ? " is-empty" : ""}`}>
                  {value}
                </p>
              </section>
            );
          })
        )}
      </div>

      <div className="export-panel">
        <button
          className="button button-primary"
          disabled={!canExport}
          onClick={onExport}
          type="button"
        >
          Export JSON
        </button>
      </div>
    </section>
  );
}

function capitalize(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
