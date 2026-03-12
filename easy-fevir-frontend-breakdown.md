# Easy FEvIR MVP Frontend Component and Task Breakdown

## Purpose

This document converts the MVP wireframe into a frontend implementation plan.

It assumes a modern component-based frontend, ideally React with TypeScript, but the structure is generic enough to adapt to another framework.

## Frontend Goal

Build a single-page application where a user can:

1. paste one source text
2. extract structured draft fields
3. review each field with source grounding
4. approve or edit fields
5. export the assembled draft as JSON

## Recommended Technical Assumptions

- React
- TypeScript
- one-page app
- local state first
- mocked extraction API first
- no authentication in v1
- no backend persistence in v1

## Suggested Component Tree

```text
AppShell
├── AppHeader
├── MainLayout
│   ├── SourcePanel
│   │   ├── SourceTypeSelect
│   │   ├── SourceMetadataForm
│   │   ├── SourceTextEditor
│   │   ├── ExtractionToolbar
│   │   └── SnippetViewer
│   ├── FieldReviewPanel
│   │   ├── ExtractionStatusBar
│   │   ├── FieldReviewList
│   │   │   └── FieldReviewCard
│   │   │       ├── FieldStatusBadge
│   │   │       ├── FieldContentView
│   │   │       ├── FieldSnippetPreview
│   │   │       └── FieldActionBar
│   │   └── InlineError
│   └── RecommendationDraftPanel
│       ├── DraftSection
│       ├── ApprovalSummary
│       └── ExportToolbar
└── ToastRegion
```

## State Ownership

Keep most application state in `AppShell` for MVP.

This is enough for v1 and avoids premature state-management complexity.

### AppShell State

- `source`
- `fields`
- `selectedFieldKey`
- `isExtracting`
- `extractError`
- `lastExportAt`

### Source State Shape

```ts
type SourceType = "text_excerpt" | "abstract" | "guideline_paragraph";

type SourceState = {
  type: SourceType;
  title: string;
  sourceId: string;
  text: string;
};
```

### Field State Shape

```ts
type FieldStatus = "draft" | "approved" | "edited";

type Snippet = {
  id: string;
  text: string;
  start?: number;
  end?: number;
};

type DraftField = {
  key: string;
  label: string;
  value: string;
  status: FieldStatus;
  snippets: Snippet[];
  confidence?: number;
};

type FieldsState = Record<string, DraftField>;
```

## Component Breakdown

## 1. `AppShell`

### Responsibility

- own page-level state
- wire components together
- coordinate extraction, field edits, approvals, and export

### Main inputs

- none

### Main outputs

- renders full app

### Key handlers

- `handleSourceChange`
- `handleExtract`
- `handleSelectField`
- `handleApproveField`
- `handleEditField`
- `handleRegenerateField`
- `handleExportJson`
- `handleResetDraft`

### Notes

For MVP, this should be the only stateful parent.

## 2. `AppHeader`

### Responsibility

- show app identity
- expose page-level actions

### Props

```ts
type AppHeaderProps = {
  canExport: boolean;
  onNewDraft: () => void;
  onExport: () => void;
};
```

### UI elements

- title
- `New Draft`
- `Export JSON`

## 3. `MainLayout`

### Responsibility

- render the 3-panel desktop layout
- collapse to stacked layout on smaller screens

### Props

- `left`
- `center`
- `right`

### Notes

This should stay presentational.

## 4. `SourcePanel`

### Responsibility

- collect source inputs
- trigger extraction
- display the currently selected snippet

### Props

```ts
type SourcePanelProps = {
  source: SourceState;
  selectedSnippet?: Snippet;
  isExtracting: boolean;
  onSourceChange: (next: Partial<SourceState>) => void;
  onExtract: () => void;
  onClear: () => void;
};
```

### Children

- `SourceTypeSelect`
- `SourceMetadataForm`
- `SourceTextEditor`
- `ExtractionToolbar`
- `SnippetViewer`

## 5. `SourceTypeSelect`

### Responsibility

- choose the source input mode

### Props

- `value`
- `onChange`

### Options

- `Text Excerpt`
- `Abstract`
- `Guideline Paragraph`

## 6. `SourceMetadataForm`

### Responsibility

- edit optional metadata

### Fields

- source title
- source ID / PMID

### Props

- `title`
- `sourceId`
- `onChange`

## 7. `SourceTextEditor`

### Responsibility

- hold the raw pasted content

### Props

- `value`
- `onChange`
- `disabled`

### Notes

Support large multi-paragraph input from the start.

## 8. `ExtractionToolbar`

### Responsibility

- trigger extraction actions

### Props

```ts
type ExtractionToolbarProps = {
  canExtract: boolean;
  isExtracting: boolean;
  onExtract: () => void;
  onClear: () => void;
};
```

### Buttons

- `Extract`
- `Clear`

## 9. `SnippetViewer`

### Responsibility

- show the selected field's grounding text

### Props

```ts
type SnippetViewerProps = {
  snippet?: Snippet;
};
```

### States

- empty state if no field is selected
- snippet shown when selected

## 10. `FieldReviewPanel`

### Responsibility

- show extraction progress
- render the review list
- show extraction errors

### Props

```ts
type FieldReviewPanelProps = {
  fields: DraftField[];
  selectedFieldKey?: string;
  isExtracting: boolean;
  error?: string;
  onSelectField: (fieldKey: string) => void;
  onApproveField: (fieldKey: string) => void;
  onEditField: (fieldKey: string, value: string) => void;
  onRegenerateField: (fieldKey: string) => void;
};
```

## 11. `ExtractionStatusBar`

### Responsibility

- display extraction state and approval counts

### Props

- `isExtracting`
- `approvedCount`
- `totalCount`

### Example output

- `Extracting structured evidence fields...`
- `5 of 8 fields approved`

## 12. `FieldReviewList`

### Responsibility

- render all field cards in the correct order

### Ordered field keys

- `title`
- `population`
- `intervention_comparator`
- `outcomes`
- `evidence_summary`
- `recommendation_statement`
- `justification`
- `references`

## 13. `FieldReviewCard`

### Responsibility

- render a single field
- support select, approve, edit, regenerate

### Props

```ts
type FieldReviewCardProps = {
  field: DraftField;
  selected: boolean;
  onSelect: () => void;
  onApprove: () => void;
  onEdit: (value: string) => void;
  onRegenerate: () => void;
};
```

### Child pieces

- `FieldStatusBadge`
- `FieldContentView`
- `FieldSnippetPreview`
- `FieldActionBar`

### Notes

This is the most important interactive component in the app.

## 14. `FieldStatusBadge`

### Responsibility

- show `Draft`, `Approved`, or `Edited`

### Props

- `status`

## 15. `FieldContentView`

### Responsibility

- display field text
- switch into edit mode

### Props

- `value`
- `editable`
- `onChange`

### Notes

For MVP, inline editing is enough. No rich text editor needed.

## 16. `FieldSnippetPreview`

### Responsibility

- show the primary snippet inside the card

### Props

- `snippet?: Snippet`

### Notes

This preview is separate from the full snippet viewer in the left panel.

## 17. `FieldActionBar`

### Responsibility

- expose field-level actions

### Props

- `onApprove`
- `onEditToggle`
- `onRegenerate`

### Buttons

- `Approve`
- `Edit`
- `Regenerate`

## 18. `InlineError`

### Responsibility

- show extraction or regeneration failures

### Props

- `message`

## 19. `RecommendationDraftPanel`

### Responsibility

- assemble all current field values into one clean draft view

### Props

```ts
type RecommendationDraftPanelProps = {
  fields: DraftField[];
  onExport: () => void;
};
```

### Children

- multiple `DraftSection`
- `ApprovalSummary`
- `ExportToolbar`

## 20. `DraftSection`

### Responsibility

- display one assembled section of the current recommendation

### Props

- `title`
- `value`
- `status`

### Notes

Draft sections should visually show whether the content is approved or still provisional.

## 21. `ApprovalSummary`

### Responsibility

- summarize review completeness

### Props

- `approvedCount`
- `editedCount`
- `draftCount`

## 22. `ExportToolbar`

### Responsibility

- expose export action in the draft panel

### Props

- `canExport`
- `onExport`

## 23. `ToastRegion`

### Responsibility

- show lightweight feedback

### Example messages

- `Draft exported`
- `Field regenerated`
- `Draft reset`

## Supporting Hooks and Utilities

## 1. `useDraftState`

### Responsibility

- centralize draft state operations

### Methods

- `setSource`
- `setFields`
- `updateField`
- `approveField`
- `selectField`
- `resetDraft`

## 2. `extractDraftFromSource`

### Responsibility

- call backend or mock extraction service

### Input

- `SourceState`

### Output

- structured field response

### MVP note

Start with mocked extraction data if the backend does not exist yet.

## 3. `mapExtractionResponseToFields`

### Responsibility

- normalize extraction response into frontend field state

## 4. `exportDraftJson`

### Responsibility

- serialize current draft into JSON
- trigger file download

## 5. `getPrimarySnippetForField`

### Responsibility

- pick the snippet displayed in preview and viewer

## Task Breakdown

## Phase 1. App Skeleton

### Task 1. Create base page shell

- build `AppShell`
- build `AppHeader`
- build `MainLayout`

### Done when

- page renders 3 columns on desktop
- page renders clean stacked layout on mobile

## Phase 2. Source Input

### Task 2. Build source controls

- implement `SourcePanel`
- implement `SourceTypeSelect`
- implement `SourceMetadataForm`
- implement `SourceTextEditor`
- implement `ExtractionToolbar`

### Done when

- user can choose source type
- user can type source metadata
- user can paste source text
- `Extract` enables only when text exists

## Phase 3. Mocked Review Flow

### Task 3. Build field review cards with mocked data

- implement `FieldReviewPanel`
- implement `ExtractionStatusBar`
- implement `FieldReviewList`
- implement `FieldReviewCard`
- implement `FieldStatusBadge`

### Done when

- mocked extracted fields appear in card order
- selecting a card marks it active
- approval state updates in UI

## Phase 4. Editing and Draft Assembly

### Task 4. Add field editing and live draft rendering

- implement `FieldContentView`
- implement `FieldActionBar`
- implement `RecommendationDraftPanel`
- implement `DraftSection`
- implement `ApprovalSummary`

### Done when

- user can edit a field inline
- user can approve a field
- right panel updates live from current state

## Phase 5. Snippet Grounding

### Task 5. Connect cards to source snippets

- implement `SnippetViewer`
- implement `FieldSnippetPreview`
- wire `selectedFieldKey` to snippet display

### Done when

- selecting a field shows its primary snippet in the left panel
- each card shows an inline snippet preview

## Phase 6. Extraction Wiring

### Task 6. Implement extraction request flow

- create `extractDraftFromSource`
- create `mapExtractionResponseToFields`
- wire `handleExtract`
- show loading and error states

### Done when

- clicking `Extract` populates field cards from a response
- loading and failure states are visible
- source text is preserved on failure

## Phase 7. Field Regeneration

### Task 7. Implement per-field regeneration

- add `handleRegenerateField`
- re-request only one field
- preserve all other fields

### Done when

- one field can be regenerated independently
- approved fields remain unchanged

## Phase 8. Export

### Task 8. Add JSON export

- implement `exportDraftJson`
- add `ExportToolbar`
- add success toast

### Done when

- user can download the current draft as JSON
- exported payload matches the frontend state

## Phase 9. Cleanup and UX Polish

### Task 9. Empty, loading, and error states

- add empty states across all panels
- add inline error presentation
- add basic toasts

### Done when

- no blank or confusing states remain
- user can understand what to do at every stage

## Task Priorities

### Must build first

- layout
- source input
- mocked field cards
- live draft preview

### Must build before demo

- snippet grounding
- extraction loading state
- export JSON

### Can wait if time is tight

- per-field confidence
- polished toasts
- richer editing controls

## Definition of Done for Frontend V1

- Single-page layout is usable on desktop and mobile
- User can paste a source and extract fields
- User can review 8 core fields
- User can approve and edit fields
- User can see source grounding for each field
- User can export the current result as JSON

## Suggested Delivery Sequence

1. Static UI with mocked data
2. Interactive review state
3. Live draft assembly
4. Source snippet linking
5. Extraction service integration
6. Export and polish

## Recommended Next Step After Frontend Breakdown

The next most useful artifact is a technical API contract for:

- `POST /extract`
- `POST /regenerate-field`
- export payload shape

That would let frontend and backend move in parallel.
