# Easy FEvIR MVP

This workspace now contains a minimal React + TypeScript prototype for the Easy FEvIR MVP plus a tiny local API with optional OpenAI-backed extraction.

Architecture and next-stage design live in:

- [easy-fevir-architecture.md](/Users/bilelUser/ness/easy-fevir-architecture.md)
- [easy-fevir-roadmap.md](/Users/bilelUser/ness/easy-fevir-roadmap.md)

## Goal

The app demonstrates the core workflow:

- load one concrete source document
- extract 8 FEvIR-oriented draft fields
- review each field with source grounding
- approve, edit, or regenerate individual fields
- assemble a live recommendation draft
- export the current draft as JSON

## App structure

- [index.html](/Users/bilelUser/ness/index.html)
- [package.json](/Users/bilelUser/ness/package.json)
- [src/App.tsx](/Users/bilelUser/ness/src/App.tsx)
- [src/components/SourcePanel.tsx](/Users/bilelUser/ness/src/components/SourcePanel.tsx)
- [src/components/FieldReviewPanel.tsx](/Users/bilelUser/ness/src/components/FieldReviewPanel.tsx)
- [src/components/RecommendationDraftPanel.tsx](/Users/bilelUser/ness/src/components/RecommendationDraftPanel.tsx)
- [src/styles.css](/Users/bilelUser/ness/src/styles.css)
- [src/lib/draftApi.ts](/Users/bilelUser/ness/src/lib/draftApi.ts)
- [server/index.ts](/Users/bilelUser/ness/server/index.ts)
- [server/draft-store.ts](/Users/bilelUser/ness/server/draft-store.ts)
- [server/extraction-service.ts](/Users/bilelUser/ness/server/extraction-service.ts)
- [server/openai-extractor.ts](/Users/bilelUser/ness/server/openai-extractor.ts)
- [shared/easy-fevir-engine.ts](/Users/bilelUser/ness/shared/easy-fevir-engine.ts)
- [shared/easy-fevir-drafts.ts](/Users/bilelUser/ness/shared/easy-fevir-drafts.ts)

## Demo source

The prototype loads a PRECLUDE-based example drawn from the FEvIR Primer materials so the app is immediately showable without extra setup.

## Run locally

From `/Users/bilelUser/ness`:

```bash
npm install
npm run dev:full
```

This starts:

- the React/Vite frontend
- the local API server on `http://127.0.0.1:8787`

If you want to run them separately:

```bash
npm run dev:api
npm run dev
```

Then open the local Vite URL shown in the terminal.

## Extraction modes

The frontend contract stays the same:

- `POST /api/v1/extract`
- `POST /api/v1/regenerate-field`

Draft persistence is now available through:

- `POST /api/v1/drafts`
- `GET /api/v1/drafts/latest`
- `GET /api/v1/drafts`
- `GET /api/v1/drafts/:id`

The backend can run in three modes via `EASY_FEVIR_EXTRACTION_MODE`:

- `auto` (default): use OpenAI when configured, otherwise fall back to the heuristic engine
- `openai`: attempt OpenAI first and still fall back to heuristics if the model call fails
- `heuristic`: skip the model and use only the local heuristic engine

Set these environment variables before starting the API server if you want LLM-backed extraction:

```bash
export OPENAI_API_KEY=...
export OPENAI_MODEL=gpt-5-mini
export EASY_FEVIR_EXTRACTION_MODE=auto
```

Optional overrides:

```bash
export OPENAI_BASE_URL=https://api.openai.com/v1
export EASY_FEVIR_LOG_DIR=logs
```

The OpenAI path requires structured JSON output for all 8 FEvIR draft fields plus grounded snippets. If parsing or the model call fails, the API falls back to the existing heuristic engine so the frontend flow still works.

## Build

```bash
npm run build
```

The production build output is written to:

- [dist](/Users/bilelUser/ness/dist)

## Notes

- The default extraction path is a conservative local heuristic engine.
- The frontend calls a tiny local backend with stable routes:
  - `POST /api/v1/extract`
  - `POST /api/v1/regenerate-field`
- Drafts are now saved through the backend API instead of browser-only local storage.
- The current persistence store is file-backed for the prototype and writes to [data/drafts.json](/Users/bilelUser/ness/data/drafts.json).
- The extraction layer now supports an OpenAI prompt pipeline with strict structured output plus heuristic fallback.
- Request and response quality events are logged to [logs/llm-extraction-events.jsonl](/Users/bilelUser/ness/logs/llm-extraction-events.jsonl) for prompt iteration.
- The heuristic extraction logic remains shared so fallback responses stay aligned with the frontend contract.
- This is an MVP workflow prototype, not a production FEvIR editor.
