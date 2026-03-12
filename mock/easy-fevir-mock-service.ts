import {
  EasyFevirApiError,
  extractDraft,
  regenerateField,
  type DraftField,
  type ExtractRequest,
  type ExtractResponse,
  type FieldKey,
  type FieldStatus,
  type RegenerateFieldRequest,
  type RegenerateFieldResponse,
  type Snippet,
  type SourceInput,
  type SourceType,
  type WarningCode,
  type WarningItem,
} from "../shared/easy-fevir-engine";

export type {
  DraftField,
  ExtractRequest,
  ExtractResponse,
  FieldKey,
  FieldStatus,
  RegenerateFieldRequest,
  RegenerateFieldResponse,
  Snippet,
  SourceInput,
  SourceType,
  WarningCode,
  WarningItem,
};

export type MockServiceOptions = {
  latencyMs?: number;
};

export class MockApiError extends EasyFevirApiError {}

const DEFAULT_LATENCY_MS = 600;

export async function mockExtractDraft(
  request: ExtractRequest,
  options: MockServiceOptions = {},
): Promise<ExtractResponse> {
  await delay(options.latencyMs ?? DEFAULT_LATENCY_MS);
  return extractDraft(request);
}

export async function mockRegenerateField(
  request: RegenerateFieldRequest,
  options: MockServiceOptions = {},
): Promise<RegenerateFieldResponse> {
  await delay(options.latencyMs ?? DEFAULT_LATENCY_MS / 2);
  return regenerateField(request);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
