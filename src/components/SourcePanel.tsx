import type { Snippet, SourceInput, SourceType } from "../types";

type SourcePanelProps = {
  source: SourceInput;
  isBusy: boolean;
  selectedSnippet?: Snippet;
  onSourceChange: (next: Partial<SourceInput>) => void;
  onLoadDemo: () => void;
  onClear: () => void;
  onExtract: () => void;
};

export function SourcePanel({
  source,
  isBusy,
  selectedSnippet,
  onSourceChange,
  onLoadDemo,
  onClear,
  onExtract,
}: SourcePanelProps) {
  const hasText = Boolean(source.text.trim());

  return (
    <section aria-labelledby="sourceHeading" className="panel source-panel" data-panel="source">
      <div className="panel-head">
        <div>
          <p className="panel-kicker">Input</p>
          <h2 id="sourceHeading">Source Material</h2>
        </div>
        <div className="panel-badge">Panel 1</div>
      </div>

      <div className="field-grid">
        <label className="input-group">
          <span>Source Type</span>
          <select
            onChange={(event) => onSourceChange({ type: event.target.value as SourceType })}
            value={source.type}
          >
            <option value="text_excerpt">Text Excerpt</option>
            <option value="abstract">Abstract</option>
            <option value="guideline_paragraph">Guideline Paragraph</option>
          </select>
        </label>

        <label className="input-group">
          <span>Source ID / PMID</span>
          <input
            onChange={(event) => onSourceChange({ source_id: event.target.value })}
            placeholder="Optional identifier"
            type="text"
            value={source.source_id ?? ""}
          />
        </label>
      </div>

      <label className="input-group">
        <span>Source Title</span>
        <input
          onChange={(event) => onSourceChange({ title: event.target.value })}
          placeholder="Optional title"
          type="text"
          value={source.title ?? ""}
        />
      </label>

      <label className="input-group input-group-large">
        <span>Source Text</span>
        <textarea
          onChange={(event) => onSourceChange({ text: event.target.value })}
          placeholder="Paste an abstract, trial summary, or guideline paragraph to generate a grounded FEvIR draft."
          rows={16}
          value={source.text}
        />
      </label>

      <div className="toolbar">
        <button className="button button-ghost" onClick={onLoadDemo} type="button">
          Load PRECLUDE Demo
        </button>
        <button className="button button-secondary" onClick={onClear} type="button">
          Clear
        </button>
        <button
          className="button button-primary"
          disabled={!hasText || isBusy}
          onClick={onExtract}
          type="button"
        >
          {isBusy ? "Extracting..." : "Extract"}
        </button>
      </div>

      <section aria-labelledby="snippetHeading" className="snippet-panel">
        <div className="snippet-head">
          <div>
            <p className="panel-kicker">Grounding</p>
            <h3 id="snippetHeading">Source Snippet</h3>
          </div>
        </div>

        <div className={`snippet-viewer${selectedSnippet ? "" : " empty-state"}`}>
          {selectedSnippet ? (
            selectedSnippet.text
          ) : (
            <>Select a field to inspect the exact source text that supports it.</>
          )}
        </div>
      </section>
    </section>
  );
}
