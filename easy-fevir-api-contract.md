# Easy FEvIR MVP API Contract

## Purpose

This document defines the backend contract for the Easy FEvIR MVP.

The contract is designed to support the frontend described in:

- [easy-fevir-mvp-wireframe.md](./easy-fevir-mvp-wireframe.md)
- [easy-fevir-frontend-breakdown.md](./easy-fevir-frontend-breakdown.md)

The MVP backend should do two things well:

1. extract FEvIR-relevant draft fields from one source text
2. regenerate one field without disturbing the others

This contract is intentionally stateless for v1.

## API Design Principles

- Keep the API stateless in MVP.
- Return structured outputs, not prose blobs.
- Require source grounding for every generated field.
- Allow per-field regeneration without resetting the whole draft.
- Avoid premature FEvIR write integration.
- Make frontend mocking easy.

## Versioning

Use explicit versioned routes:

- `/api/v1/extract`
- `/api/v1/regenerate-field`

## Authentication

No authentication is required for the internal MVP.

If the app becomes multi-user or internet-exposed later, add bearer-token auth at the gateway level rather than changing the payload contract.

## Content Type

All requests and responses use:

- `Content-Type: application/json`
- `Accept: application/json`

## Status Codes

- `200 OK` successful extraction or regeneration
- `400 Bad Request` invalid payload
- `413 Payload Too Large` source text too large
- `422 Unprocessable Entity` source accepted but extraction could not produce a reliable result
- `500 Internal Server Error` unexpected failure
- `503 Service Unavailable` model or extraction service unavailable

## Core Domain Types

## Source

```json
{
  "type": "abstract",
  "title": "OnabotulinumtoxinA for the preventive treatment of episodic migraine",
  "source_id": "PMID:41091731",
  "text": "Full pasted source text here"
}
```

### Field definitions

- `type`
  - enum: `text_excerpt`, `abstract`, `guideline_paragraph`
- `title`
  - optional string
- `source_id`
  - optional string
- `text`
  - required string

## Snippet

```json
{
  "id": "snip_01",
  "text": "Patients were 18-65 years of age with a history of episodic migraine.",
  "start": 128,
  "end": 205
}
```

### Field definitions

- `id`
  - required string
- `text`
  - required string
- `start`
  - optional integer character index
- `end`
  - optional integer character index

## Draft Field

```json
{
  "key": "population",
  "label": "Population",
  "value": "Adults aged 18-65 years with episodic migraine.",
  "status": "draft",
  "confidence": 0.84,
  "snippets": [
    {
      "id": "snip_01",
      "text": "Patients were 18-65 years of age with a history of episodic migraine.",
      "start": 128,
      "end": 205
    }
  ]
}
```

### Field definitions

- `key`
  - required enum:
    - `title`
    - `population`
    - `intervention_comparator`
    - `outcomes`
    - `evidence_summary`
    - `recommendation_statement`
    - `justification`
    - `references`
- `label`
  - required string
- `value`
  - required string
- `status`
  - enum: `draft`, `approved`, `edited`
- `confidence`
  - optional number between `0` and `1`
- `snippets`
  - array of `Snippet`

For backend-generated fields in MVP, `status` should always be returned as `draft`.

## Extract Endpoint

## `POST /api/v1/extract`

### Purpose

Generate the initial set of structured fields from one source text.

### Request body

```json
{
  "source": {
    "type": "abstract",
    "title": "OnabotulinumtoxinA for the preventive treatment of episodic migraine",
    "source_id": "PMID:41091731",
    "text": "Patients aged 18-65 years were randomized..."
  },
  "options": {
    "include_confidence": true,
    "max_snippets_per_field": 3
  }
}
```

### Request schema

```json
{
  "type": "object",
  "required": ["source"],
  "properties": {
    "source": {
      "type": "object",
      "required": ["type", "text"],
      "properties": {
        "type": {
          "type": "string",
          "enum": ["text_excerpt", "abstract", "guideline_paragraph"]
        },
        "title": {
          "type": "string"
        },
        "source_id": {
          "type": "string"
        },
        "text": {
          "type": "string",
          "minLength": 1
        }
      }
    },
    "options": {
      "type": "object",
      "properties": {
        "include_confidence": {
          "type": "boolean"
        },
        "max_snippets_per_field": {
          "type": "integer",
          "minimum": 1,
          "maximum": 5
        }
      }
    }
  }
}
```

### Response body

```json
{
  "request_id": "req_7f2c9f58",
  "generated_at": "2026-03-12T22:15:00Z",
  "fields": [
    {
      "key": "title",
      "label": "Title",
      "value": "Draft recommendation for episodic migraine prophylaxis",
      "status": "draft",
      "confidence": 0.76,
      "snippets": [
        {
          "id": "snip_01",
          "text": "OnabotulinumtoxinA for the preventive treatment of episodic migraine",
          "start": 0,
          "end": 74
        }
      ]
    },
    {
      "key": "population",
      "label": "Population",
      "value": "Adults aged 18-65 years with episodic migraine.",
      "status": "draft",
      "confidence": 0.84,
      "snippets": [
        {
          "id": "snip_02",
          "text": "Patients aged 18-65 years with episodic migraine...",
          "start": 75,
          "end": 140
        }
      ]
    }
  ],
  "warnings": [
    {
      "code": "MISSING_CERTAINTY",
      "message": "No explicit certainty-of-evidence statement was found in the source."
    }
  ]
}
```

### Response schema

```json
{
  "type": "object",
  "required": ["request_id", "generated_at", "fields"],
  "properties": {
    "request_id": {
      "type": "string"
    },
    "generated_at": {
      "type": "string"
    },
    "fields": {
      "type": "array",
      "items": {
        "type": "object"
      }
    },
    "warnings": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "code": {
            "type": "string"
          },
          "message": {
            "type": "string"
          }
        }
      }
    }
  }
}
```

### Extraction requirements

The backend should attempt to return all 8 fields:

- `title`
- `population`
- `intervention_comparator`
- `outcomes`
- `evidence_summary`
- `recommendation_statement`
- `justification`
- `references`

If a field cannot be generated reliably:

- still return the field
- return an empty string for `value`
- return `status: "draft"`
- return an empty snippet array if necessary
- add a warning if useful

That is better than omitting the field, because the frontend relies on a stable card order.

## Regenerate Field Endpoint

## `POST /api/v1/regenerate-field`

### Purpose

Regenerate one field using the same source while preserving the rest of the document state on the frontend.

This endpoint is also stateless.

The frontend sends the current source and optionally the current values of other fields for context.

### Request body

```json
{
  "source": {
    "type": "abstract",
    "title": "OnabotulinumtoxinA for the preventive treatment of episodic migraine",
    "source_id": "PMID:41091731",
    "text": "Patients aged 18-65 years were randomized..."
  },
  "target_field": "justification",
  "current_fields": [
    {
      "key": "population",
      "value": "Adults aged 18-65 years with episodic migraine.",
      "status": "approved"
    },
    {
      "key": "intervention_comparator",
      "value": "OnabotulinumtoxinA compared with placebo.",
      "status": "approved"
    },
    {
      "key": "evidence_summary",
      "value": "The trial did not show a significant reduction in migraine days compared with placebo.",
      "status": "edited"
    }
  ],
  "options": {
    "include_confidence": true,
    "max_snippets_per_field": 3
  }
}
```

### Request schema

```json
{
  "type": "object",
  "required": ["source", "target_field"],
  "properties": {
    "source": {
      "type": "object"
    },
    "target_field": {
      "type": "string",
      "enum": [
        "title",
        "population",
        "intervention_comparator",
        "outcomes",
        "evidence_summary",
        "recommendation_statement",
        "justification",
        "references"
      ]
    },
    "current_fields": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["key", "value", "status"],
        "properties": {
          "key": {
            "type": "string"
          },
          "value": {
            "type": "string"
          },
          "status": {
            "type": "string",
            "enum": ["draft", "approved", "edited"]
          }
        }
      }
    },
    "options": {
      "type": "object"
    }
  }
}
```

### Response body

```json
{
  "request_id": "req_a91204c3",
  "generated_at": "2026-03-12T22:18:00Z",
  "field": {
    "key": "justification",
    "label": "Justification",
    "value": "Because the source does not show clear superiority over placebo on the primary endpoint, any recommendation should be cautious and explicitly note the absence of significant benefit in the reported trial findings.",
    "status": "draft",
    "confidence": 0.69,
    "snippets": [
      {
        "id": "snip_11",
        "text": "The results showed that there was no significant difference.",
        "start": 560,
        "end": 621
      }
    ]
  },
  "warnings": []
}
```

### Response schema

```json
{
  "type": "object",
  "required": ["request_id", "generated_at", "field"],
  "properties": {
    "request_id": {
      "type": "string"
    },
    "generated_at": {
      "type": "string"
    },
    "field": {
      "type": "object"
    },
    "warnings": {
      "type": "array"
    }
  }
}
```

### Regeneration rules

- Regeneration only returns the target field.
- The backend must not return the entire document unless the contract is explicitly changed.
- The frontend remains responsible for preserving all non-target fields.
- The backend may use `current_fields` as context, but it should not overwrite them.

## Validation Rules

## Input validation

Reject with `400 Bad Request` when:

- `source` is missing
- `source.type` is invalid
- `source.text` is empty
- `target_field` is invalid

Reject with `413 Payload Too Large` when:

- source text exceeds the configured max length

Recommended MVP limit:

- `source.text` maximum: `25,000` characters

That is large enough for abstracts and excerpts, but still controlled for latency and cost.

## Output validation

Before returning a successful response:

- ensure all required fields exist
- ensure field keys are valid
- ensure snippets are arrays
- ensure confidence, if present, is between `0` and `1`

## Warning Codes

Suggested non-fatal warnings:

- `MISSING_POPULATION`
- `MISSING_COMPARATOR`
- `MISSING_OUTCOMES`
- `MISSING_CERTAINTY`
- `LOW_GROUNDING_CONFIDENCE`
- `AMBIGUOUS_RECOMMENDATION_BASIS`
- `SOURCE_TOO_SHORT`

Warnings are useful because they let the frontend show uncertainty without blocking the user.

## Error Response Shape

All non-200 responses should follow one shape.

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "source.text is required",
    "details": [
      {
        "field": "source.text",
        "message": "Must not be empty"
      }
    ]
  }
}
```

### Error code suggestions

- `INVALID_REQUEST`
- `PAYLOAD_TOO_LARGE`
- `EXTRACTION_UNAVAILABLE`
- `EXTRACTION_FAILED`
- `FIELD_REGENERATION_FAILED`
- `UPSTREAM_MODEL_TIMEOUT`

## Export Payload Shape

Export can remain frontend-only in MVP, but the exported JSON should follow a stable structure that mirrors the API outputs.

```json
{
  "source": {
    "type": "abstract",
    "title": "OnabotulinumtoxinA for the preventive treatment of episodic migraine",
    "source_id": "PMID:41091731",
    "text": "Patients aged 18-65 years were randomized..."
  },
  "fields": {
    "title": {
      "value": "Draft recommendation for episodic migraine prophylaxis",
      "status": "approved",
      "confidence": 0.76,
      "snippets": [
        {
          "id": "snip_01",
          "text": "OnabotulinumtoxinA for the preventive treatment of episodic migraine",
          "start": 0,
          "end": 74
        }
      ]
    },
    "population": {
      "value": "Adults aged 18-65 years with episodic migraine.",
      "status": "approved",
      "confidence": 0.84,
      "snippets": [
        {
          "id": "snip_02",
          "text": "Patients aged 18-65 years with episodic migraine...",
          "start": 75,
          "end": 140
        }
      ]
    }
  },
  "meta": {
    "exported_at": "2026-03-12T22:20:00Z",
    "app_version": "mvp"
  }
}
```

## Backend Behavior Requirements

## Grounding requirement

Each generated field should include at least one snippet whenever possible.

The backend should not generate high-confidence recommendation text without support text.

## Recommendation safety requirement

The backend should avoid fabricating:

- certainty ratings
- strength of recommendation
- effect sizes
- risk-of-bias judgments

If these are not explicit in the source, the backend should:

- leave them implicit
- phrase outputs cautiously
- emit warnings when useful

## Reference handling

For `references`:

- prefer source title or source ID if available
- if the source is too sparse, return the best available citation fragment

## Latency targets

Recommended MVP targets:

- `/extract`: under `8` seconds in normal use
- `/regenerate-field`: under `5` seconds in normal use

These are targets, not hard guarantees.

## Frontend Integration Notes

## Stable field order

The frontend expects fields in this order:

1. `title`
2. `population`
3. `intervention_comparator`
4. `outcomes`
5. `evidence_summary`
6. `recommendation_statement`
7. `justification`
8. `references`

The backend can return fields as an array, but it should preserve this order when possible.

## Partial results

Partial results are allowed.

That means:

- empty field values are acceptable
- warnings are acceptable
- the request should still return `200 OK` if the backend produced a usable partial result

Use `422` only when the extraction was not meaningfully usable at all.

## Mock Response For Frontend Development

This is the minimum useful mocked response shape:

```json
{
  "request_id": "req_mock_001",
  "generated_at": "2026-03-12T22:25:00Z",
  "fields": [
    {
      "key": "title",
      "label": "Title",
      "value": "Draft recommendation for episodic migraine prophylaxis",
      "status": "draft",
      "snippets": [
        {
          "id": "snip_01",
          "text": "OnabotulinumtoxinA for the preventive treatment of episodic migraine"
        }
      ]
    },
    {
      "key": "population",
      "label": "Population",
      "value": "Adults with episodic migraine.",
      "status": "draft",
      "snippets": [
        {
          "id": "snip_02",
          "text": "Patients aged 18-65 years with episodic migraine..."
        }
      ]
    },
    {
      "key": "intervention_comparator",
      "label": "Intervention / Comparator",
      "value": "OnabotulinumtoxinA compared with placebo.",
      "status": "draft",
      "snippets": [
        {
          "id": "snip_03",
          "text": "The trial compared onabotulinumtoxinA with placebo."
        }
      ]
    },
    {
      "key": "outcomes",
      "label": "Outcomes",
      "value": "Monthly migraine days, headache days, responder rate, rescue medication use, and patient-reported outcomes.",
      "status": "draft",
      "snippets": [
        {
          "id": "snip_04",
          "text": "Primary and secondary endpoints included monthly migraine days and other outcome measures."
        }
      ]
    },
    {
      "key": "evidence_summary",
      "label": "Evidence Summary",
      "value": "The primary endpoint did not show a significant benefit over placebo.",
      "status": "draft",
      "snippets": [
        {
          "id": "snip_05",
          "text": "There was no significant difference."
        }
      ]
    },
    {
      "key": "recommendation_statement",
      "label": "Recommendation Statement",
      "value": "No strong recommendation should be made from this source alone without acknowledging the lack of significant benefit on the primary endpoint.",
      "status": "draft",
      "snippets": [
        {
          "id": "snip_06",
          "text": "The results showed that there was no significant difference."
        }
      ]
    },
    {
      "key": "justification",
      "label": "Justification",
      "value": "The justification should note that the evidence described here does not clearly establish superiority to placebo.",
      "status": "draft",
      "snippets": [
        {
          "id": "snip_07",
          "text": "The primary endpoint did not meaningfully reduce migraine days better than placebo."
        }
      ]
    },
    {
      "key": "references",
      "label": "References",
      "value": "PMID:41091731",
      "status": "draft",
      "snippets": [
        {
          "id": "snip_08",
          "text": "PMID: 41091731"
        }
      ]
    }
  ],
  "warnings": []
}
```

## Recommended Backend Build Order

1. Implement request validation
2. Implement mocked `/extract`
3. Implement mocked `/regenerate-field`
4. Add structured error responses
5. Replace mocked extraction with real model-backed logic
6. Add logging and latency tracking

## Definition of Done for Backend V1

- `/api/v1/extract` accepts source text and returns all 8 fields
- `/api/v1/regenerate-field` returns one target field only
- every field includes snippets whenever possible
- validation and error shapes are stable
- partial results are supported
- frontend can fully integrate without backend persistence

## Recommended Next Step

The next useful artifact after this is a concrete implementation scaffold:

- frontend mock service based on this contract, or
- backend starter project with route handlers and sample responses
