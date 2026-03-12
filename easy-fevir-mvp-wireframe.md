# Easy FEvIR MVP Wireframe Spec

## Purpose

Build a simple AI-assisted FEvIR drafting tool that lets a user paste one source text, extract structured fields, review each field with traceable support, and export a draft JSON payload.

This MVP is intentionally narrow. It is not a full FEvIR editor, not a generic chatbot, and not a complete FHIR authoring environment.

## Product Goal

The product should make one task faster:

"Turn one source document into one reviewable recommendation draft with less manual data entry."

## Primary User

- Guideline author
- Evidence analyst
- Clinical content editor

These users understand the medical content, but they should not need to work directly with FHIR JSON to produce a useful draft.

## Core User Flow

1. User pastes a source abstract, article excerpt, or guideline paragraph.
2. User clicks `Extract`.
3. The system generates draft FEvIR-relevant fields.
4. User reviews each field with supporting source text.
5. User edits, approves, or regenerates fields.
6. The recommendation draft updates live.
7. User exports the result as JSON.

## Information Architecture

The MVP should be a single-page app with three panels.

- Left panel: source input and source viewer
- Center panel: field-by-field review
- Right panel: assembled recommendation draft

## Desktop Wireframe

```text
+----------------------------------------------------------------------------------+
| Header: Easy FEvIR MVP                                      [New Draft] [Export] |
+----------------------------------------------------------------------------------+
| LEFT: Source                   | CENTER: Structured Fields | RIGHT: Draft        |
|--------------------------------|---------------------------|----------------------|
| Source Type                    | Extraction Status         | Recommendation Title |
| [Text Excerpt v]               | Draft generated           | ------------------- |
|                                | 5/8 approved              |                      |
| Source Title                   |                           | Recommendation       |
| [optional text input]          | [Card: Population]        | ------------------- |
|                                | AI draft                  |                      |
| PMID / Source ID               | Source snippet            | Population           |
| [optional text input]          | [Approve] [Edit] [Retry]  | ------------------- |
|                                |                           |                      |
| Source Text                    | [Card: Intervention]      | Action              |
| ----------------------------   | AI draft                  | ------------------- |
| large pasted content area      | Source snippet            |                      |
|                                | [Approve] [Edit] [Retry]  | Evidence Summary    |
|                                |                           | ------------------- |
| [Extract] [Clear]              | [Card: Outcomes]          |                      |
|                                | ...                       | Justification       |
| Snippet Viewer                 |                           | ------------------- |
| ----------------------------   | [Card: Evidence Summary]  |                      |
| selected support text          | ...                       | References          |
| highlighted here               |                           | ------------------- |
|                                | [Card: Recommendation]    |                      |
|                                | ...                       | Approval Status     |
|                                |                           | 5 approved / 3 draft|
+----------------------------------------------------------------------------------+
```

## Mobile Wireframe

On mobile, collapse the three panels into stacked tabs.

```text
Header
[Source] [Fields] [Draft]

Source tab
- source type
- optional title / PMID
- text area
- Extract button

Fields tab
- field cards
- approve / edit / retry actions

Draft tab
- assembled recommendation
- export button
```

Mobile should preserve the same workflow, but desktop is the primary design target for MVP.

## Screen Sections

### 1. Header

Purpose:
- identify the tool
- expose top-level actions

Elements:
- app title: `Easy FEvIR MVP`
- `New Draft`
- `Export JSON`

Behavior:
- `New Draft` resets the full page after confirmation
- `Export JSON` is disabled until at least one extraction has completed

### 2. Left Panel: Source

Purpose:
- collect source material
- keep the original content visible during review

Elements:
- `Source Type` dropdown
  - `Text Excerpt`
  - `Abstract`
  - `Guideline Paragraph`
- `Source Title` optional input
- `PMID / Source ID` optional input
- large multiline `Source Text` textarea
- action buttons
  - `Extract`
  - `Clear`
- `Snippet Viewer`

Behavior:
- `Extract` runs only when source text is not empty
- `Snippet Viewer` updates when a field card is selected in the center panel
- if a field has multiple supporting snippets, show the primary one first

### 3. Center Panel: Structured Fields

Purpose:
- let the user review AI output one field at a time
- keep the interaction grounded and auditable

Each field should appear as a review card.

Required cards:
- Title
- Population
- Intervention / Comparator
- Outcomes
- Evidence Summary
- Recommendation Statement
- Justification
- References

Each card contains:
- field label
- field status: `Draft`, `Approved`, or `Edited`
- AI-generated text
- source snippet
- optional confidence tag
- actions
  - `Approve`
  - `Edit`
  - `Regenerate`

Behavior:
- selecting a card highlights its source snippet in the left panel
- `Approve` marks the field approved and updates the right panel
- `Edit` switches the draft text into editable mode
- `Regenerate` refreshes only that field, not the whole draft

### 4. Right Panel: Recommendation Draft

Purpose:
- show the assembled result as a single coherent output
- help the user understand what the final draft currently looks like

Sections:
- Recommendation Title
- Recommendation Statement
- Population
- Action / Comparator
- Outcomes
- Evidence Summary
- Justification
- References
- Approval summary

Behavior:
- updates live whenever a field is approved or edited
- draft sections should be visually distinct from approved sections
- if a field is missing, show a placeholder like `Not reviewed yet`

## Interaction Rules

### Extraction

When the user clicks `Extract`, the system should:

1. parse the source text
2. generate the required fields
3. attach one or more supporting snippets per field
4. populate the review cards
5. mark all fields as `Draft`

### Editing

If the user edits a field manually:

- status changes to `Edited`
- edited value overrides the AI draft in the right panel
- original AI output should remain recoverable via a `Restore AI Draft` action in later versions

For MVP, this restore action can be omitted if needed.

### Approval

Approval is field-level, not document-level.

That matters because:
- users may trust some fields and not others
- reviewers may want to leave uncertain sections in draft state

### Regeneration

Regeneration should be local to one field.

Example:
- user likes Population and Outcomes
- user dislikes Justification
- clicking `Regenerate` on Justification should not wipe approved fields

## States

### Empty State

Before any source is entered:

- left panel shows helper text:
  `Paste an abstract, article excerpt, or guideline paragraph to start.`
- center panel shows:
  `No extracted fields yet.`
- right panel shows:
  `Your recommendation draft will appear here.`

### Loading State

After `Extract` is clicked:

- disable `Extract`
- show spinner or loading bar
- show text:
  `Extracting structured evidence fields...`

### Partial Result State

If the system cannot fill all fields:

- populate what it can
- leave missing cards with:
  `No reliable draft generated`
- allow manual entry

### Error State

If extraction fails:

- preserve source text
- show inline message:
  `Extraction failed. Try again or shorten the source text.`

## UX Principles

- The UI should feel like an assisted editor, not a chat app.
- Every generated field should be traceable to source text.
- The user should always know what is AI-generated versus human-edited.
- The system should prefer transparency over automation.
- The design should reduce cognitive load, not add clever but opaque interactions.

## Suggested Visual Hierarchy

- Left panel is utilitarian and document-oriented.
- Center panel is the main work area.
- Right panel is calmer and cleaner, focused on the assembled output.

Use visual emphasis in this order:

1. field content
2. source grounding
3. field status
4. secondary metadata like confidence

## Component List

- `AppHeader`
- `SourcePanel`
- `SourceTypeSelect`
- `SourceMetadataForm`
- `SourceTextarea`
- `ExtractionToolbar`
- `SnippetViewer`
- `FieldReviewList`
- `FieldReviewCard`
- `FieldStatusBadge`
- `RecommendationDraftPanel`
- `ApprovalSummary`
- `ExportButton`

## Draft Data Shape

```json
{
  "source": {
    "type": "abstract",
    "title": "",
    "source_id": "",
    "text": ""
  },
  "fields": {
    "title": {
      "value": "",
      "status": "draft",
      "snippets": []
    },
    "population": {
      "value": "",
      "status": "draft",
      "snippets": []
    },
    "intervention_comparator": {
      "value": "",
      "status": "draft",
      "snippets": []
    },
    "outcomes": {
      "value": "",
      "status": "draft",
      "snippets": []
    },
    "evidence_summary": {
      "value": "",
      "status": "draft",
      "snippets": []
    },
    "recommendation_statement": {
      "value": "",
      "status": "draft",
      "snippets": []
    },
    "justification": {
      "value": "",
      "status": "draft",
      "snippets": []
    },
    "references": {
      "value": "",
      "status": "draft",
      "snippets": []
    }
  }
}
```

## MVP Acceptance Criteria

- User can paste one source text and run extraction.
- User sees all core field cards in one screen.
- Each field card includes supporting source text.
- User can approve, edit, or regenerate a single field.
- The assembled recommendation draft updates live.
- User can export the current result as JSON.

## Deliberately Excluded From V1

- multiple documents
- FEvIR account login
- FEvIR API write integration
- collaborative comments
- reviewer assignments
- version comparison
- full FHIR JSON editor
- automatic certainty scoring
- ontology browsing

## Recommended Build Order

1. Static single-page layout
2. Field cards with mocked data
3. Live draft panel updates
4. Source snippet linking
5. Extraction backend or mocked extraction service
6. JSON export

## Next Document To Write

After this wireframe spec, the next useful artifact should be:

- a clickable component breakdown for frontend build, or
- a technical implementation spec for the extraction pipeline
