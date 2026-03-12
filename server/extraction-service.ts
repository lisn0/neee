import {
  computeWarnings,
  createErrorResponse,
  extractDraft as heuristicExtractDraft,
  regenerateField as heuristicRegenerateField,
  validateSourceInput,
  type DraftField,
  type ExtractRequest,
  type ExtractResponse,
  type FieldKey,
  type RegenerateFieldRequest,
  type RegenerateFieldResponse,
  type WarningItem,
} from "../shared/easy-fevir-engine";
import { logExtractionEvent } from "./extraction-logger";
import {
  extractDraftWithOpenAi,
  getOpenAiConfig,
  regenerateFieldWithOpenAi,
} from "./openai-extractor";

type ExtractionMode = "auto" | "openai" | "heuristic";

const EXTRACTION_MODE = (process.env.EASY_FEVIR_EXTRACTION_MODE ?? "auto") as ExtractionMode;

export async function runExtract(request: ExtractRequest): Promise<ExtractResponse> {
  validateSourceInput(request.source);
  const startedAt = Date.now();
  const openAi = getOpenAiConfig();

  if (shouldUseOpenAi(openAi.configured)) {
    try {
      const llmResult = await extractDraftWithOpenAi(request);
      const response = {
        ...llmResult.response,
        warnings: computeWarnings(llmResult.response.fields, request.source.text),
      };
      await logExtractionEvent({
        timestamp: new Date().toISOString(),
        route: "extract",
        mode_requested: EXTRACTION_MODE,
        mode_used: "openai",
        model: llmResult.telemetry.model,
        request_id: response.request_id,
        duration_ms: Date.now() - startedAt,
        source: buildSourceLogShape(request.source),
        quality: summarizeExtractQuality(response.fields, response.warnings),
        llm: {
          prompt_version: llmResult.telemetry.promptVersion,
          provider_response_id: llmResult.telemetry.providerResponseId,
          usage: llmResult.telemetry.usage,
          raw_output_preview: llmResult.telemetry.rawOutputPreview,
        },
      });
      return response;
    } catch (error) {
      const fallback = heuristicExtractDraft(request);
      await logExtractionEvent({
        timestamp: new Date().toISOString(),
        route: "extract",
        mode_requested: EXTRACTION_MODE,
        mode_used: "heuristic_fallback",
        model: openAi.model,
        request_id: fallback.request_id,
        duration_ms: Date.now() - startedAt,
        fallback_reason: buildErrorMessage(error),
        source: buildSourceLogShape(request.source),
        quality: summarizeExtractQuality(fallback.fields, fallback.warnings),
        error: {
          message: buildErrorMessage(error),
        },
      });
      return fallback;
    }
  }

  const fallback = heuristicExtractDraft(request);
  await logExtractionEvent({
    timestamp: new Date().toISOString(),
    route: "extract",
    mode_requested: EXTRACTION_MODE,
    mode_used: "heuristic",
    request_id: fallback.request_id,
    duration_ms: Date.now() - startedAt,
    source: buildSourceLogShape(request.source),
    quality: summarizeExtractQuality(fallback.fields, fallback.warnings),
  });
  return fallback;
}

export async function runRegenerateField(
  request: RegenerateFieldRequest,
): Promise<RegenerateFieldResponse> {
  validateSourceInput(request.source);
  const startedAt = Date.now();
  const openAi = getOpenAiConfig();

  if (shouldUseOpenAi(openAi.configured)) {
    try {
      const llmResult = await regenerateFieldWithOpenAi(request);
      const response = {
        ...llmResult.response,
        warnings: computeWarnings([llmResult.response.field], request.source.text, [request.target_field]),
      };
      await logExtractionEvent({
        timestamp: new Date().toISOString(),
        route: "regenerate-field",
        mode_requested: EXTRACTION_MODE,
        mode_used: "openai",
        model: llmResult.telemetry.model,
        request_id: response.request_id,
        duration_ms: Date.now() - startedAt,
        source: buildSourceLogShape(request.source),
        quality: summarizeFieldQuality(request.target_field, response.field, response.warnings),
        llm: {
          prompt_version: llmResult.telemetry.promptVersion,
          provider_response_id: llmResult.telemetry.providerResponseId,
          usage: llmResult.telemetry.usage,
          raw_output_preview: llmResult.telemetry.rawOutputPreview,
        },
      });
      return response;
    } catch (error) {
      const fallback = heuristicRegenerateField(request);
      await logExtractionEvent({
        timestamp: new Date().toISOString(),
        route: "regenerate-field",
        mode_requested: EXTRACTION_MODE,
        mode_used: "heuristic_fallback",
        model: openAi.model,
        request_id: fallback.request_id,
        duration_ms: Date.now() - startedAt,
        fallback_reason: buildErrorMessage(error),
        source: buildSourceLogShape(request.source),
        quality: summarizeFieldQuality(request.target_field, fallback.field, fallback.warnings),
        error: {
          message: buildErrorMessage(error),
        },
      });
      return fallback;
    }
  }

  const fallback = heuristicRegenerateField(request);
  await logExtractionEvent({
    timestamp: new Date().toISOString(),
    route: "regenerate-field",
    mode_requested: EXTRACTION_MODE,
    mode_used: "heuristic",
    request_id: fallback.request_id,
    duration_ms: Date.now() - startedAt,
    source: buildSourceLogShape(request.source),
    quality: summarizeFieldQuality(request.target_field, fallback.field, fallback.warnings),
  });
  return fallback;
}

export { createErrorResponse };

function shouldUseOpenAi(configured: boolean): boolean {
  if (EXTRACTION_MODE === "heuristic") {
    return false;
  }

  if (EXTRACTION_MODE === "openai") {
    return configured;
  }

  return configured;
}

function buildSourceLogShape(source: ExtractRequest["source"]) {
  return {
    type: source.type,
    title: source.title,
    source_id: source.source_id,
    length: source.text.length,
    preview: source.text.slice(0, 500),
  };
}

function summarizeExtractQuality(fields: DraftField[], warnings: WarningItem[]) {
  const populated = fields.filter((field) => field.value.trim().length > 0);
  const grounded = fields.filter((field) => field.snippets.length > 0);
  const averageConfidence =
    fields.reduce((sum, field) => sum + (field.confidence ?? 0), 0) / Math.max(fields.length, 1);

  return {
    field_count: fields.length,
    populated_field_count: populated.length,
    grounded_field_count: grounded.length,
    average_confidence: Number(averageConfidence.toFixed(3)),
    warning_count: warnings.length,
    missing_fields: fields.filter((field) => !field.value.trim()).map((field) => field.key),
  };
}

function summarizeFieldQuality(fieldKey: FieldKey, field: DraftField, warnings: WarningItem[]) {
  return {
    target_field: fieldKey,
    has_value: Boolean(field.value.trim()),
    snippet_count: field.snippets.length,
    confidence: field.confidence ?? 0,
    warning_count: warnings.length,
  };
}

function buildErrorMessage(error: unknown): string {
  const formatted = createErrorResponse(error);
  return formatted.body.error.message;
}
