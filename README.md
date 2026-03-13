# Easy FEvIR MVP

Easy FEvIR is a small React + TypeScript prototype for AI-assisted FEvIR-style evidence authoring.

It takes one source document, extracts a structured recommendation draft, shows grounding snippets for each field, and lets a reviewer approve, edit, regenerate, save, and export the result.

## What It Does

- extract 8 FEvIR-oriented draft fields from one source
- show source-grounded snippets for each field
- support approve, edit, and field-level regenerate
- save and load drafts through a local backend API
- export the current draft as JSON
- fall back to a heuristic extractor when no OpenAI API key is configured

## Stack

- React 19
- TypeScript
- Vite
- Node.js HTTP API
- OpenAI Responses API for structured extraction
- file-backed draft persistence for the current prototype

## Requirements

- Node.js 20+
- npm

## Quick Start

```bash
npm install
cp .env.example .env
npm run dev:full
```

This starts:

- frontend: `http://localhost:5173`
- backend API: `http://127.0.0.1:8787`

Then:

1. open the frontend URL
2. load the PRECLUDE demo source or paste your own source text
3. click `Extract`
4. review the fields
5. click `Save Draft`

## Environment

The API now loads `.env` automatically via `dotenv`.

Available settings:

```bash
PORT=8787
EASY_FEVIR_EXTRACTION_MODE=auto
EASY_FEVIR_LOG_DIR=logs
EASY_FEVIR_DATA_DIR=data
OPENAI_MODEL=gpt-5-mini
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=
```

Modes:

- `auto`: use OpenAI when configured, otherwise use heuristics
- `openai`: attempt OpenAI first, then fall back if the call fails
- `heuristic`: skip OpenAI entirely

If `OPENAI_API_KEY` is empty, the app still works with the heuristic extractor.

## Scripts

```bash
npm run dev
npm run dev:api
npm run dev:full
npm run typecheck
npm run build
npm run preview
```

## API

Extraction routes:

- `POST /api/v1/extract`
- `POST /api/v1/regenerate-field`

Draft persistence routes:

- `POST /api/v1/drafts`
- `GET /api/v1/drafts`
- `GET /api/v1/drafts/latest`
- `GET /api/v1/drafts/:id`

Health route:

- `GET /api/health`

## Local Data

This repo keeps the current prototype simple:

- draft persistence is file-backed and stored under `data/`
- extraction quality logs are written under `logs/`

These generated files are ignored by git and are recreated automatically.

## Project Docs

- [Architecture](./easy-fevir-architecture.md)
- [Roadmap](./easy-fevir-roadmap.md)
- [API Contract](./easy-fevir-api-contract.md)
- [Frontend Breakdown](./easy-fevir-frontend-breakdown.md)
- [MVP Wireframe](./easy-fevir-mvp-wireframe.md)

## Project Layout

```text
src/       frontend app
server/    local API and persistence
shared/    shared types and extraction models
```

## Notes

- this is still an MVP, not a production FEvIR editor
- the current persistence layer should be replaced with Postgres in the next phase
- the repo does not include local reference files used during development

## License

[MIT](./LICENSE)
