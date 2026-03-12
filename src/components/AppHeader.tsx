type AppHeaderProps = {
  statusLabel: string;
  canExport: boolean;
  canSaveDraft: boolean;
  canLoadDraft: boolean;
  onNewDraft: () => void;
  onExport: () => void;
  onSaveDraft: () => void;
  onLoadDraft: () => void;
};

export function AppHeader({
  statusLabel,
  canExport,
  canSaveDraft,
  canLoadDraft,
  onNewDraft,
  onExport,
  onSaveDraft,
  onLoadDraft,
}: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="brand">
        <p className="eyebrow">AI-assisted evidence authoring</p>
        <h1>Easy FEvIR MVP</h1>
        <p className="lede">
          Turn one clinical source into a grounded FEvIR-style evidence draft, review each field
          with supporting text, and save the draft to the workspace API while you iterate.
        </p>
      </div>

      <div className="header-actions">
        <div className="status-pill">{statusLabel}</div>
        <button
          className="button button-secondary"
          disabled={!canLoadDraft}
          onClick={onLoadDraft}
          type="button"
        >
          Load Draft
        </button>
        <button
          className="button button-secondary"
          disabled={!canSaveDraft}
          onClick={onSaveDraft}
          type="button"
        >
          Save Draft
        </button>
        <button className="button button-secondary" onClick={onNewDraft} type="button">
          New Draft
        </button>
        <button
          className="button button-primary"
          disabled={!canExport}
          onClick={onExport}
          type="button"
        >
          Export JSON
        </button>
      </div>
    </header>
  );
}
