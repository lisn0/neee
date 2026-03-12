# Easy FEvIR Roadmap

## Purpose

This roadmap translates the FEvIR Primer and the current prototype into a practical build sequence.

It separates:

1. what must exist for the first credible MVP
2. what must come next to become FEvIR-native
3. what should wait until the core workflows are stable

## Guiding Rule

Do not try to build the whole FEvIR platform at once.

Build in this order:

- `single-source drafting`
- `persistent drafts and reusable resources`
- `import, search, and FEvIR-native reuse`
- `governance, guideline bundles, and publication workflows`

## Must-Have For MVP

Goal:

`Turn one source document into one reviewable recommendation draft.`

### User-facing scope

- 3-panel authoring UI
- source text input
- 8 structured draft fields
- field-by-field review
- source snippet grounding
- approve / edit / regenerate
- live assembled draft
- JSON export

### Backend scope

- `POST /api/v1/extract`
- `POST /api/v1/regenerate-field`
- strict structured model output
- heuristic fallback
- extraction quality logging

### Required product behavior

- every field must show source support
- recommendation language must remain conservative
- no silent publishing
- no hidden certainty grading
- no requirement for users to touch raw FHIR JSON

### Explicitly out of MVP

- FEvIR API write integration
- multi-document synthesis
- guideline bundles
- reusable resource library UI
- PMID / NCT / RIS import
- search-before-create
- governance tooling
- committee review workflows

## Must-Have For V2

Goal:

`Move from a demo extractor to a real FEvIR authoring workspace.`

This is where the product starts matching the Primer much more closely.

### Persistence

- database-backed `sources`
- database-backed `drafts`
- database-backed `draft_fields`
- stored source snippets and provenance
- audit/event history
- `draft` and later `active` states

### Import-first workflows

- PMID / MEDLINE import
- ClinicalTrials.gov import
- RIS import
- PDF upload and extraction

Why:

The Primer repeatedly emphasizes converter-driven evidence ingestion, not only pasted text.

### Reusable resource library

- `My Resources`
- reusable populations
- reusable interventions / comparators
- reusable outcomes
- reusable citations
- reusable evidence artifacts

Why:

The Primer frames FEvIR as a reusable library of evidence assets, not a one-off form builder.

### Search-before-create

- global search across stored drafts and resources
- duplicate detection
- suggest reuse before creating new objects
- filter by resource type and metadata

### Recommendation model expansion

Move beyond the MVP 8-field model to support:

- recommendation ratings
- action / opposite action
- methods
- competing interests
- acknowledgements
- appendices

### FEvIR-native mapping

- canonical draft to FEvIR/FHIR mapper
- support for recommendation-oriented artifacts
- support for study/evidence-package artifacts

At minimum, plan for:

- `Citation`
- `Evidence`
- `EvidenceVariable`
- `Group`
- `Composition`
- `PlanDefinition`
- `ArtifactAssessment`

## Later FEvIR-Native Features

Goal:

`Support the broader FEvIR ecosystem rather than only single recommendation drafting.`

### Guideline and bundle workflows

- create guideline from multiple recommendations
- bundle related evidence artifacts
- guideline-level export and packaging

### Study and evidence-package authoring

The PRECLUDE case study suggests a distinct workflow:

- import citation
- create `Composition` container such as `ComparativeEvidenceReport`
- define `Group` / study sample
- add evidence and comparative findings
- reuse those artifacts in recommendations

This should become a dedicated authoring path, not forced into the recommendation editor.

### Governance and review

- structured artifact assessments
- comments and ratings
- change reports
- review history
- structured approval workflows

### Terminology and coding

- `CodeableConcept` authoring
- terminology-backed intervention/outcome coding
- SEVCO-aligned evidence terminology where appropriate

### Hybrid retrieval and corpus workflows

Use hybrid retrieval for:

- similarity search
- artifact reuse
- duplicate detection
- cross-document comparison
- multi-source synthesis

Do not treat this as the first extraction path.

### FEvIR platform integration

- authenticated FEvIR API reads
- authenticated FEvIR API writes
- development vs production target selection
- import and export synchronization

## Recommended Build Sequence

### Phase 1

- stabilize LLM extraction
- keep current UI
- keep current routes
- improve prompt quality and grounding

### Phase 2

- add Postgres persistence
- store sources, drafts, fields, snippets, and events
- replace browser-only persistence

### Phase 3

- add PMID / NCT / RIS / PDF ingestion
- create reusable resource records
- add search-before-create

### Phase 4

- build FEvIR/FHIR mapper
- support recommendation exports
- support study/evidence-package exports

### Phase 5

- add governance features
- add guideline bundling
- add deeper FEvIR API integration

## The Main Product Correction

The reread of the Primer changes the product framing in one important way:

Easy FEvIR should not stop at `AI fills the form faster`.

It should grow into:

`an AI-assisted workspace for importing, creating, reviewing, linking, reusing, and governing computable evidence artifacts`

That is the FEvIR-native direction.

## Immediate Recommendation

The next implementation target should be:

1. persistent drafts
2. reusable resource records
3. PMID import
4. search-before-create

That sequence is more aligned with the Primer than jumping straight to a large RAG system.
