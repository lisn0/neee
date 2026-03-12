# Easy FEvIR Mock Service

This folder contains a frontend-oriented mock service that matches the MVP API contract.

## Files

- [easy-fevir-mock-service.ts](/Users/bilelUser/ness/mock/easy-fevir-mock-service.ts)

## What it provides

- `mockExtractDraft(request)`
- `mockRegenerateField(request)`
- request and response types aligned with the planned API
- lightweight validation
- simulated latency
- deterministic field ordering

## Intended use

Use this in the frontend before a real backend exists.

The UI can call these functions exactly where it would later call:

- `POST /api/v1/extract`
- `POST /api/v1/regenerate-field`

## Example

```ts
import {
  mockExtractDraft,
  mockRegenerateField,
} from "./easy-fevir-mock-service";

const extractResponse = await mockExtractDraft({
  source: {
    type: "abstract",
    title: "OnabotulinumtoxinA for the preventive treatment of episodic migraine",
    source_id: "PMID:41091731",
    text: "Patients aged 18-65 years were randomized against placebo...",
  },
});

const regenerateResponse = await mockRegenerateField({
  source: {
    type: "abstract",
    title: "OnabotulinumtoxinA for the preventive treatment of episodic migraine",
    source_id: "PMID:41091731",
    text: "Patients aged 18-65 years were randomized against placebo...",
  },
  target_field: "justification",
  current_fields: extractResponse.fields.map((field) => ({
    key: field.key,
    value: field.value,
    status: field.status,
  })),
});
```

## Notes

- The service is intentionally conservative.
- It tries to ground every field in the source text.
- It does not attempt to invent certainty ratings or strong recommendations.
- It is a prototype support layer, not production extraction logic.
