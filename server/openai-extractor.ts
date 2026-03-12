import {
  FIELD_LABELS,
  FIELD_ORDER,
  type DraftField,
  type ExtractRequest,
  type ExtractResponse,
  type FieldKey,
  type RegenerateFieldRequest,
  type RegenerateFieldResponse,
  type Snippet,
} from "../shared/easy-fevir-engine";

const OPENAI_API_URL = `${process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1"}/responses`;
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-5-mini";
const PROMPT_VERSION = "easy-fevir-llm-v1";

type LlmFieldShape = {
  value: string;
  confidence: number;
  snippets: string[];
};

type LlmExtractResult = Record<FieldKey, LlmFieldShape>;

type LlmRegenerateResult = {
  field: LlmFieldShape;
};

type OpenAiRawResponse = {
  id?: string;
  output_text?: string;
  output?: Array<{
    content?: Array<
      | {
          type?: string;
          text?: string;
        }
      | Record<string, unknown>
    >;
  }>;
  usage?: Record<string, unknown>;
};

export function getOpenAiConfig() {
  return {
    apiKey: process.env.OPENAI_API_KEY,
    model: OPENAI_MODEL,
    promptVersion: PROMPT_VERSION,
    configured: Boolean(process.env.OPENAI_API_KEY),
  };
}

export async function extractDraftWithOpenAi(
  request: ExtractRequest,
): Promise<{
  response: ExtractResponse;
  telemetry: {
    model: string;
    providerResponseId?: string;
    usage?: Record<string, unknown>;
    rawOutputPreview: string;
    promptVersion: string;
  };
}> {
  const prompt = buildExtractPrompt(request);
  const schema = createFullExtractionSchema();
  const raw = await callOpenAi({
    prompt,
    schemaName: "easy_fevir_extract",
    schema,
  });
  const parsed = parseJsonText<LlmExtractResult>(raw.outputText);

  return {
    response: {
      request_id: makeRequestId(),
      generated_at: new Date().toISOString(),
      fields: FIELD_ORDER.map((key) =>
        normalizeLlmField({
          key,
          shape: parsed[key],
          sourceText: request.source.text,
          maxSnippets: request.options?.max_snippets_per_field ?? 3,
          includeConfidence: request.options?.include_confidence !== false,
        }),
      ),
      warnings: [],
    },
    telemetry: {
      model: OPENAI_MODEL,
      providerResponseId: raw.responseId,
      usage: raw.usage,
      rawOutputPreview: raw.outputText.slice(0, 1200),
      promptVersion: PROMPT_VERSION,
    },
  };
}

export async function regenerateFieldWithOpenAi(
  request: RegenerateFieldRequest,
): Promise<{
  response: RegenerateFieldResponse;
  telemetry: {
    model: string;
    providerResponseId?: string;
    usage?: Record<string, unknown>;
    rawOutputPreview: string;
    promptVersion: string;
  };
}> {
  const prompt = buildRegeneratePrompt(request);
  const schema = createSingleFieldSchema(request.target_field);
  const raw = await callOpenAi({
    prompt,
    schemaName: `easy_fevir_regenerate_${request.target_field}`,
    schema,
  });
  const parsed = parseJsonText<LlmRegenerateResult>(raw.outputText);

  return {
    response: {
      request_id: makeRequestId(),
      generated_at: new Date().toISOString(),
      field: normalizeLlmField({
        key: request.target_field,
        shape: parsed.field,
        sourceText: request.source.text,
        maxSnippets: request.options?.max_snippets_per_field ?? 3,
        includeConfidence: request.options?.include_confidence !== false,
      }),
      warnings: [],
    },
    telemetry: {
      model: OPENAI_MODEL,
      providerResponseId: raw.responseId,
      usage: raw.usage,
      rawOutputPreview: raw.outputText.slice(0, 1200),
      promptVersion: PROMPT_VERSION,
    },
  };
}

async function callOpenAi(params: {
  prompt: string;
  schemaName: string;
  schema: Record<string, unknown>;
}): Promise<{
  responseId?: string;
  outputText: string;
  usage?: Record<string, unknown>;
}> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      store: false,
      input: params.prompt,
      text: {
        format: {
          type: "json_schema",
          name: params.schemaName,
          strict: true,
          schema: params.schema,
        },
      },
    }),
  });

  const payload = (await response.json()) as OpenAiRawResponse & {
    error?: { message?: string; type?: string };
  };

  if (!response.ok) {
    throw new Error(payload.error?.message ?? `OpenAI request failed with status ${response.status}`);
  }

  const outputText = extractOutputText(payload);
  if (!outputText.trim()) {
    throw new Error("OpenAI response did not contain structured output text");
  }

  return {
    responseId: payload.id,
    outputText,
    usage: payload.usage,
  };
}

function extractOutputText(payload: OpenAiRawResponse): string {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text;
  }

  for (const output of payload.output ?? []) {
    for (const content of output.content ?? []) {
      if (
        content &&
        typeof content === "object" &&
        "text" in content &&
        typeof content.text === "string" &&
        content.text.trim()
      ) {
        return content.text;
      }
    }
  }

  return "";
}

function createFullExtractionSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: FIELD_ORDER,
    properties: FIELD_ORDER.reduce<Record<string, unknown>>((accumulator, key) => {
      accumulator[key] = createFieldSchema(FIELD_LABELS[key]);
      return accumulator;
    }, {}),
  };
}

function createSingleFieldSchema(targetField: FieldKey): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["field"],
    properties: {
      field: createFieldSchema(FIELD_LABELS[targetField]),
    },
  };
}

function createFieldSchema(fieldLabel: string): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["value", "confidence", "snippets"],
    properties: {
      value: {
        type: "string",
        description: `Grounded FEvIR draft text for ${fieldLabel}. Use an empty string if not supported by the source.`,
      },
      confidence: {
        type: "number",
        minimum: 0,
        maximum: 1,
        description: "A conservative confidence score from 0 to 1.",
      },
      snippets: {
        type: "array",
        description:
          "Up to 3 exact source snippets copied verbatim from the source text. Use an empty array if no snippet supports this field.",
        items: {
          type: "string",
        },
      },
    },
  };
}

function buildExtractPrompt(request: ExtractRequest): string {
  return [
    "You are an extraction engine for an Easy FEvIR authoring workflow.",
    "Return only structured JSON that matches the provided schema.",
    "Rules:",
    "- Use only the supplied source text.",
    "- Do not invent certainty ratings, GRADE values, risk-of-bias judgments, or effect sizes.",
    "- If the source does not support a field, set value to an empty string and snippets to an empty array.",
    "- Every snippet must be copied verbatim from the source text.",
    "- Recommendation Statement and Justification must stay cautious and review-oriented.",
    "- Confidence must be a number between 0 and 1.",
    "",
    `Source type: ${request.source.type}`,
    `Source title: ${request.source.title ?? ""}`,
    `Source id: ${request.source.source_id ?? ""}`,
    "Target fields:",
    FIELD_ORDER.map((field) => `- ${field}`).join("\n"),
    "",
    "Source text:",
    request.source.text,
  ].join("\n");
}

function buildRegeneratePrompt(request: RegenerateFieldRequest): string {
  const context = (request.current_fields ?? [])
    .map((field) => `- ${field.key} (${field.status}): ${field.value}`)
    .join("\n");

  return [
    "You are refreshing one FEvIR field for an Easy FEvIR authoring workflow.",
    "Return only structured JSON that matches the provided schema.",
    "Rules:",
    "- Use only the supplied source text.",
    "- Use current fields only as context; do not copy unsupported claims forward.",
    "- Every snippet must be copied verbatim from the source text.",
    "- If the source does not support the target field, return an empty string and an empty snippet array.",
    "- Keep recommendation and justification language cautious.",
    "",
    `Target field: ${request.target_field}`,
    `Source type: ${request.source.type}`,
    `Source title: ${request.source.title ?? ""}`,
    `Source id: ${request.source.source_id ?? ""}`,
    "",
    "Current field context:",
    context || "(none)",
    "",
    "Source text:",
    request.source.text,
  ].join("\n");
}

function normalizeLlmField(params: {
  key: FieldKey;
  shape: LlmFieldShape | undefined;
  sourceText: string;
  maxSnippets: number;
  includeConfidence: boolean;
}): DraftField {
  const rawShape = params.shape ?? {
    value: "",
    confidence: 0,
    snippets: [],
  };

  const snippets = rawShape.snippets
    .filter((snippet): snippet is string => Boolean(snippet?.trim()))
    .slice(0, params.maxSnippets)
    .map((snippet, index) => normalizeSnippet(params.key, snippet, params.sourceText, index));

  return {
    key: params.key,
    label: FIELD_LABELS[params.key],
    value: (rawShape.value ?? "").trim(),
    status: "draft",
    snippets,
    confidence: params.includeConfidence ? clampConfidence(rawShape.confidence) : undefined,
  };
}

function normalizeSnippet(
  key: FieldKey,
  snippet: string,
  sourceText: string,
  index: number,
): Snippet {
  const normalized = snippet.trim().slice(0, 320);
  const matchIndex = sourceText.indexOf(normalized);

  return {
    id: `${key}_${index}_${Math.random().toString(36).slice(2, 8)}`,
    text: normalized,
    start: matchIndex >= 0 ? matchIndex : undefined,
    end: matchIndex >= 0 ? matchIndex + normalized.length : undefined,
  };
}

function parseJsonText<T>(text: string): T {
  return JSON.parse(text) as T;
}

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}

function makeRequestId(): string {
  return `req_${Math.random().toString(36).slice(2, 10)}`;
}
