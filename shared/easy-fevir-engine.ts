export type SourceType = "text_excerpt" | "abstract" | "guideline_paragraph";

export type FieldKey =
  | "title"
  | "population"
  | "intervention_comparator"
  | "outcomes"
  | "evidence_summary"
  | "recommendation_statement"
  | "justification"
  | "references";

export type FieldStatus = "draft" | "approved" | "edited";

export type Snippet = {
  id: string;
  text: string;
  start?: number;
  end?: number;
};

export type SourceInput = {
  type: SourceType;
  title?: string;
  source_id?: string;
  text: string;
};

export type DraftField = {
  key: FieldKey;
  label: string;
  value: string;
  status: FieldStatus;
  snippets: Snippet[];
  confidence?: number;
};

export type WarningCode =
  | "MISSING_POPULATION"
  | "MISSING_COMPARATOR"
  | "MISSING_OUTCOMES"
  | "MISSING_CERTAINTY"
  | "LOW_GROUNDING_CONFIDENCE"
  | "AMBIGUOUS_RECOMMENDATION_BASIS"
  | "SOURCE_TOO_SHORT";

export type WarningItem = {
  code: WarningCode;
  message: string;
};

export type ExtractRequest = {
  source: SourceInput;
  options?: {
    include_confidence?: boolean;
    max_snippets_per_field?: number;
  };
};

export type ExtractResponse = {
  request_id: string;
  generated_at: string;
  fields: DraftField[];
  warnings: WarningItem[];
};

export type RegenerateFieldRequest = {
  source: SourceInput;
  target_field: FieldKey;
  current_fields?: Array<{
    key: FieldKey;
    value: string;
    status: FieldStatus;
  }>;
  options?: {
    include_confidence?: boolean;
    max_snippets_per_field?: number;
  };
};

export type RegenerateFieldResponse = {
  request_id: string;
  generated_at: string;
  field: DraftField;
  warnings: WarningItem[];
};

export class EasyFevirApiError extends Error {
  code: string;
  status: number;
  details?: Array<{ field: string; message: string }>;

  constructor(params: {
    code: string;
    message: string;
    status: number;
    details?: Array<{ field: string; message: string }>;
  }) {
    super(params.message);
    this.name = "EasyFevirApiError";
    this.code = params.code;
    this.status = params.status;
    this.details = params.details;
  }
}

export const FIELD_ORDER: FieldKey[] = [
  "title",
  "population",
  "intervention_comparator",
  "outcomes",
  "evidence_summary",
  "recommendation_statement",
  "justification",
  "references",
];

export const FIELD_LABELS: Record<FieldKey, string> = {
  title: "Title",
  population: "Population",
  intervention_comparator: "Intervention / Comparator",
  outcomes: "Outcomes",
  evidence_summary: "Evidence Summary",
  recommendation_statement: "Recommendation Statement",
  justification: "Justification",
  references: "References",
};

const MAX_SOURCE_LENGTH = 25000;

type BuildFieldParams = {
  key: FieldKey;
  source: SourceInput;
  text: string;
  sentences: string[];
  context: Partial<Record<FieldKey, string>>;
  includeConfidence: boolean;
};

type FieldBuildResult = {
  value: string;
  snippets: Snippet[];
  confidence: number;
};

export function extractDraft(request: ExtractRequest): ExtractResponse {
  validateSourceInput(request.source);

  const text = normalizeText(request.source.text);
  const sentences = splitSentences(text);
  const includeConfidence = request.options?.include_confidence !== false;
  const context: Partial<Record<FieldKey, string>> = {};

  const fields = FIELD_ORDER.map((key) => {
    const field = trimSnippets(
      buildField({
        key,
        source: request.source,
        text,
        sentences,
        context,
        includeConfidence,
      }),
      request.options?.max_snippets_per_field ?? 3,
    );

    context[key] = field.value;
    return field;
  });

  return {
    request_id: makeRequestId(),
    generated_at: new Date().toISOString(),
    fields,
    warnings: computeWarnings(fields, text),
  };
}

export function regenerateField(request: RegenerateFieldRequest): RegenerateFieldResponse {
  validateSourceInput(request.source);

  if (!FIELD_ORDER.includes(request.target_field)) {
    throw new EasyFevirApiError({
      code: "INVALID_REQUEST",
      message: "target_field is invalid",
      status: 400,
      details: [{ field: "target_field", message: "Must be a supported field key" }],
    });
  }

  const text = normalizeText(request.source.text);
  const sentences = splitSentences(text);
  const includeConfidence = request.options?.include_confidence !== false;
  const context = buildContextFromCurrentFields(request.current_fields);

  const field = trimSnippets(
    buildField({
      key: request.target_field,
      source: request.source,
      text,
      sentences,
      context,
      includeConfidence,
    }),
    request.options?.max_snippets_per_field ?? 3,
  );

  return {
    request_id: makeRequestId(),
    generated_at: new Date().toISOString(),
    field,
    warnings: computeWarnings([field], text, [request.target_field]),
  };
}

export function createErrorResponse(error: unknown) {
  if (error instanceof EasyFevirApiError) {
    return {
      status: error.status,
      body: {
        error: {
          code: error.code,
          message: error.message,
          details: error.details ?? [],
        },
      },
    };
  }

  return {
    status: 500,
    body: {
      error: {
        code: "EXTRACTION_FAILED",
        message: "Unexpected extraction failure",
        details: [],
      },
    },
  };
}

function buildField(params: BuildFieldParams): DraftField {
  const result = FIELD_BUILDERS[params.key](params);

  return {
    key: params.key,
    label: FIELD_LABELS[params.key],
    value: result.value,
    status: "draft",
    snippets: result.snippets,
    confidence: params.includeConfidence ? result.confidence : undefined,
  };
}

const FIELD_BUILDERS: Record<FieldKey, (params: BuildFieldParams) => FieldBuildResult> = {
  title: buildTitleField,
  population: buildPopulationField,
  intervention_comparator: buildInterventionComparatorField,
  outcomes: buildOutcomesField,
  evidence_summary: buildEvidenceSummaryField,
  recommendation_statement: buildRecommendationStatementField,
  justification: buildJustificationField,
  references: buildReferencesField,
};

function buildTitleField(params: BuildFieldParams): FieldBuildResult {
  const title = params.source.title?.trim();

  if (title) {
    const cleaned = cleanSentence(title).replace(/\.$/, "");
    return {
      value: `Evidence note: ${cleaned}`,
      snippets: [makeSnippet("title", title, params.text)],
      confidence: 0.94,
    };
  }

  const sentence = scoreSentences(params.sentences, [
    { terms: ["trial"], weight: 3 },
    { terms: ["guideline"], weight: 3 },
    { terms: ["study"], weight: 2 },
    { terms: ["evidence"], weight: 1 },
  ]);

  const label = sentence ? `Evidence note: ${stripTrailingPeriod(sentence)}` : "Evidence note: Untitled source";

  return {
    value: label,
    snippets: sentence ? [makeSnippet("title", sentence, params.text)] : [],
    confidence: sentence ? 0.71 : 0.28,
  };
}

function buildPopulationField(params: BuildFieldParams): FieldBuildResult {
  const sentence = scoreSentences(params.sentences, [
    { terms: ["patients"], weight: 4 },
    { terms: ["participants"], weight: 4 },
    { terms: ["aged"], weight: 2 },
    { terms: ["history of"], weight: 2 },
    { terms: ["episodic migraine"], weight: 3 },
    { terms: ["population"], weight: 2 },
  ]);

  return {
    value: sentence ? normalizePopulation(sentence) : "",
    snippets: sentence ? [makeSnippet("population", sentence, params.text)] : [],
    confidence: sentence ? 0.86 : 0.3,
  };
}

function buildInterventionComparatorField(params: BuildFieldParams): FieldBuildResult {
  const sentence = scoreSentences(params.sentences, [
    { terms: ["compared with"], weight: 5 },
    { terms: ["placebo"], weight: 4 },
    { terms: ["versus"], weight: 4 },
    { terms: ["vs"], weight: 4 },
    { terms: ["intervention"], weight: 3 },
    { terms: ["comparator"], weight: 3 },
    { terms: ["randomized"], weight: 2 },
  ]);

  if (sentence) {
    return {
      value: capitalizeFirst(normalizeInterventionComparator(sentence)),
      snippets: [makeSnippet("intervention", sentence, params.text)],
      confidence: 0.87,
    };
  }

  const titleHint = params.source.title ? deriveComparatorFromTitle(params.source.title) : "";

  return {
    value: titleHint,
    snippets: titleHint ? [makeSnippet("intervention", params.source.title ?? "", params.text)] : [],
    confidence: titleHint ? 0.56 : 0.28,
  };
}

function buildOutcomesField(params: BuildFieldParams): FieldBuildResult {
  const primary = scoreSentences(params.sentences, [
    { terms: ["primary endpoint"], weight: 6 },
    { terms: ["primary"], weight: 2 },
    { terms: ["migraine days"], weight: 3 },
    { terms: ["outcome"], weight: 2 },
  ]);

  const secondary = scoreSentences(params.sentences, [
    { terms: ["secondary endpoints"], weight: 6 },
    { terms: ["secondary endpoint"], weight: 5 },
    { terms: ["responder"], weight: 2 },
    { terms: ["patient-reported"], weight: 2 },
    { terms: ["rescue medication"], weight: 2 },
    { terms: ["headache days"], weight: 2 },
  ]);

  const snippets = [primary, secondary]
    .filter((value): value is string => Boolean(value))
    .map((value, index) => makeSnippet(`outcomes_${index}`, value, params.text));

  if (primary && secondary) {
    return {
      value: `Primary outcome: ${stripTrailingPeriod(primary)}. Secondary outcomes: ${stripTrailingPeriod(secondary)}.`,
      snippets,
      confidence: 0.88,
    };
  }

  if (primary) {
    return {
      value: `Primary outcome: ${stripTrailingPeriod(primary)}.`,
      snippets,
      confidence: 0.8,
    };
  }

  return {
    value: "",
    snippets: [],
    confidence: 0.3,
  };
}

function buildEvidenceSummaryField(params: BuildFieldParams): FieldBuildResult {
  const sentence = scoreSentences(params.sentences, [
    { terms: ["no significant difference"], weight: 8 },
    { terms: ["did not"], weight: 4 },
    { terms: ["better than placebo"], weight: 6 },
    { terms: ["significant difference"], weight: 3 },
    { terms: ["results showed"], weight: 2 },
    { terms: ["conclusion"], weight: 2 },
  ]);

  if (!sentence) {
    return {
      value: "",
      snippets: [],
      confidence: 0.34,
    };
  }

  const normalized = cleanSentence(sentence);

  return {
    value: `This source reports the following key evidence finding: ${stripTrailingPeriod(normalized)}.`,
    snippets: [makeSnippet("evidence", sentence, params.text)],
    confidence: 0.9,
  };
}

function buildRecommendationStatementField(params: BuildFieldParams): FieldBuildResult {
  const evidence = params.context.evidence_summary?.trim();
  const population = params.context.population?.trim();
  const intervention = params.context.intervention_comparator?.trim();
  const sourceEvidence = findPrimaryEvidenceSentence(params.sentences);
  const limitation = findLimitationSentence(params.sentences);

  if (evidence || sourceEvidence) {
    const snippets = [sourceEvidence, limitation]
      .filter((value): value is string => Boolean(value))
      .map((value, index) => makeSnippet(`recommendation_${index}`, value, params.text));

    return {
      value:
        "Use this source as a reviewable recommendation draft input rather than a stand-alone basis for a strong recommendation, and confirm applicability, outcome importance, and certainty before finalizing the recommendation.",
      snippets: snippets.length > 0 ? snippets : deriveSnippetsFromContext(params, ["evidence_summary"]),
      confidence: 0.74,
    };
  }

  if (population && intervention) {
    return {
      value: `Draft a reviewable recommendation for ${lowercaseFirst(population)} only after confirming applicability, outcome importance, and certainty of evidence for ${lowercaseFirst(intervention)}.`,
      snippets: deriveSnippetsFromContext(params, ["population", "intervention_comparator"]),
      confidence: 0.66,
    };
  }

  return {
    value: "",
    snippets: [],
    confidence: 0.26,
  };
}

function buildJustificationField(params: BuildFieldParams): FieldBuildResult {
  const evidence = params.context.evidence_summary?.trim();
  const outcomes = params.context.outcomes?.trim();
  const sourceEvidence = findPrimaryEvidenceSentence(params.sentences);
  const limitation = findLimitationSentence(params.sentences);

  if (evidence || outcomes || sourceEvidence) {
    const snippets = [sourceEvidence, limitation]
      .filter((value): value is string => Boolean(value))
      .map((value, index) => makeSnippet(`justification_${index}`, value, params.text));

    return {
      value:
        "The justification should connect the reported findings and any stated study limitations to the proposed recommendation, while leaving certainty and strength judgments to human review.",
      snippets:
        snippets.length > 0 ? snippets : deriveSnippetsFromContext(params, ["outcomes", "evidence_summary"]),
      confidence: 0.72,
    };
  }

  return {
    value: "",
    snippets: [],
    confidence: 0.24,
  };
}

function buildReferencesField(params: BuildFieldParams): FieldBuildResult {
  const title = params.source.title?.trim();
  const sourceId = params.source.source_id?.trim();

  if (title && sourceId) {
    return {
      value: `${title} (${sourceId})`,
      snippets: [
        makeSnippet("references_title", title, params.text),
        makeSnippet("references_id", sourceId, params.text),
      ],
      confidence: 0.96,
    };
  }

  if (sourceId) {
    return {
      value: sourceId,
      snippets: [makeSnippet("references", sourceId, params.text)],
      confidence: 0.95,
    };
  }

  if (title) {
    return {
      value: title,
      snippets: [makeSnippet("references", title, params.text)],
      confidence: 0.74,
    };
  }

  return {
    value: "",
    snippets: [],
    confidence: 0.2,
  };
}

function normalizePopulation(sentence: string): string {
  return stripTrailingPeriod(
    sentence
      .replace(/^The\s+/i, "")
      .replace(/^Patients\s+were\s+/i, "Patients were ")
      .replace(/\s+/g, " "),
  ).concat(".");
}

function normalizeInterventionComparator(sentence: string): string {
  const compact = sentence
    .replace(/^Intervention arms included\s+/i, "")
    .replace(/^The trial compared\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();

  return stripTrailingPeriod(compact).concat(".");
}

function deriveComparatorFromTitle(title: string): string {
  const normalized = cleanSentence(title);

  if (/placebo/i.test(normalized)) {
    return `${stripTrailingPeriod(normalized)}.`;
  }

  if (/vs\.?|versus/i.test(normalized)) {
    return `${stripTrailingPeriod(normalized)}.`;
  }

  return "";
}

function findPrimaryEvidenceSentence(sentences: string[]): string | undefined {
  return rankStrictEvidenceSentence(sentences, [
    { terms: ["no significant difference"], weight: 8 },
    { terms: ["better than placebo"], weight: 6 },
    { terms: ["did not"], weight: 4 },
    { terms: ["results showed"], weight: 2 },
    { terms: ["reported"], weight: 2 },
    { terms: ["feasible"], weight: 2 },
    { terms: ["improved"], weight: 2 },
  ]);
}

function findLimitationSentence(sentences: string[]): string | undefined {
  return rankStrictEvidenceSentence(sentences, [
    { terms: ["pilot"], weight: 3 },
    { terms: ["small sample"], weight: 4 },
    { terms: ["limited certainty"], weight: 4 },
    { terms: ["limited"], weight: 2 },
    { terms: ["feasibility"], weight: 2 },
  ]);
}

function rankStrictEvidenceSentence(
  sentences: string[],
  rules: Array<{ terms: string[]; weight: number }>,
): string | undefined {
  const ranked = sentences
    .map((sentence) => ({
      sentence,
      score: scoreSentenceWithoutGenericBoost(sentence, rules),
    }))
    .filter((item) => item.score >= 2)
    .sort((left, right) => right.score - left.score || left.sentence.length - right.sentence.length);

  return ranked[0]?.sentence;
}

function scoreSentenceWithoutGenericBoost(
  sentence: string,
  rules: Array<{ terms: string[]; weight: number }>,
): number {
  const normalized = sentence.toLowerCase();
  let score = 0;

  for (const rule of rules) {
    if (rule.terms.every((term) => normalized.includes(term.toLowerCase()))) {
      score += rule.weight;
    }
  }

  return score;
}

function deriveSnippetsFromContext(
  params: BuildFieldParams,
  keys: Array<keyof Partial<Record<FieldKey, string>>>,
): Snippet[] {
  return keys
    .map((key, index) => {
      const value = params.context[key];
      return value ? makeSnippet(`${String(key)}_${index}`, value, params.text) : null;
    })
    .filter((item): item is Snippet => Boolean(item));
}

export function computeWarnings(
  fields: DraftField[],
  text: string,
  expectedKeys: FieldKey[] = FIELD_ORDER,
): WarningItem[] {
  const warnings: WarningItem[] = [];
  const byKey = new Map(fields.map((field) => [field.key, field]));

  if (text.length < 120) {
    warnings.push({
      code: "SOURCE_TOO_SHORT",
      message: "The source text is short, so extraction quality may be limited.",
    });
  }

  if (expectedKeys.includes("population") && !byKey.get("population")?.value) {
    warnings.push({
      code: "MISSING_POPULATION",
      message: "No clear population statement was detected in the source.",
    });
  }

  if (
    expectedKeys.includes("intervention_comparator") &&
    !byKey.get("intervention_comparator")?.value
  ) {
    warnings.push({
      code: "MISSING_COMPARATOR",
      message: "No clear intervention or comparator statement was detected in the source.",
    });
  }

  if (expectedKeys.includes("outcomes") && !byKey.get("outcomes")?.value) {
    warnings.push({
      code: "MISSING_OUTCOMES",
      message: "No explicit outcome language was detected in the source.",
    });
  }

  if (
    expectedKeys.includes("evidence_summary") &&
    (byKey.get("evidence_summary")?.confidence ?? 0) < 0.55
  ) {
    warnings.push({
      code: "LOW_GROUNDING_CONFIDENCE",
      message: "The evidence summary is weakly grounded and should be reviewed carefully.",
    });
  }

  if (!/certainty|risk of bias|grade/i.test(text)) {
    warnings.push({
      code: "MISSING_CERTAINTY",
      message: "No explicit certainty, GRADE, or risk-of-bias language was found in the source.",
    });
  }

  if (
    expectedKeys.includes("recommendation_statement") &&
    (byKey.get("recommendation_statement")?.confidence ?? 0) < 0.5
  ) {
    warnings.push({
      code: "AMBIGUOUS_RECOMMENDATION_BASIS",
      message: "This source alone does not provide a strong basis for a confident recommendation draft.",
    });
  }

  return dedupeWarnings(warnings);
}

export function validateSourceInput(source: SourceInput | undefined): asserts source is SourceInput {
  const details: Array<{ field: string; message: string }> = [];

  if (!source) {
    throw new EasyFevirApiError({
      code: "INVALID_REQUEST",
      message: "source is required",
      status: 400,
      details: [{ field: "source", message: "Must be provided" }],
    });
  }

  if (!["text_excerpt", "abstract", "guideline_paragraph"].includes(source.type)) {
    details.push({ field: "source.type", message: "Must be a supported source type" });
  }

  if (!source.text || !source.text.trim()) {
    details.push({ field: "source.text", message: "Must not be empty" });
  }

  if ((source.text ?? "").length > MAX_SOURCE_LENGTH) {
    throw new EasyFevirApiError({
      code: "PAYLOAD_TOO_LARGE",
      message: "source.text exceeds the maximum allowed size",
      status: 413,
      details: [
        {
          field: "source.text",
          message: `Must be ${MAX_SOURCE_LENGTH} characters or fewer`,
        },
      ],
    });
  }

  if (details.length > 0) {
    throw new EasyFevirApiError({
      code: "INVALID_REQUEST",
      message: "The request payload is invalid",
      status: 400,
      details,
    });
  }
}

function buildContextFromCurrentFields(
  currentFields: RegenerateFieldRequest["current_fields"],
): Partial<Record<FieldKey, string>> {
  const context: Partial<Record<FieldKey, string>> = {};

  for (const field of currentFields ?? []) {
    context[field.key] = field.value;
  }

  return context;
}

function trimSnippets(field: DraftField, maxSnippets: number): DraftField {
  return {
    ...field,
    snippets: field.snippets.slice(0, Math.max(1, maxSnippets)),
  };
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function scoreSentences(
  sentences: string[],
  rules: Array<{ terms: string[]; weight: number }>,
): string | undefined {
  const ranked = sentences
    .map((sentence) => ({
      sentence,
      score: scoreSentence(sentence, rules),
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.sentence.length - right.sentence.length);

  return ranked[0]?.sentence;
}

function scoreSentence(
  sentence: string,
  rules: Array<{ terms: string[]; weight: number }>,
): number {
  const normalized = sentence.toLowerCase();
  let score = 0;

  for (const rule of rules) {
    if (rule.terms.every((term) => normalized.includes(term.toLowerCase()))) {
      score += rule.weight;
    }
  }

  if (/placebo|patients|outcome|endpoint|result|trial|guideline/.test(normalized)) {
    score += 1;
  }

  return score;
}

function cleanSentence(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function makeSnippet(prefix: string, rawText: string, sourceText: string): Snippet {
  const snippetText = cleanSentence(rawText).slice(0, 320);
  const sourceIndex = sourceText.toLowerCase().indexOf(snippetText.toLowerCase());
  const start = sourceIndex >= 0 ? sourceIndex : undefined;
  const end = sourceIndex >= 0 ? sourceIndex + snippetText.length : undefined;

  return {
    id: `${prefix}_${Math.random().toString(36).slice(2, 8)}`,
    text: snippetText,
    start,
    end,
  };
}

function makeRequestId(): string {
  return `req_${Math.random().toString(36).slice(2, 10)}`;
}

function dedupeWarnings(warnings: WarningItem[]): WarningItem[] {
  const seen = new Set<string>();

  return warnings.filter((warning) => {
    if (seen.has(warning.code)) {
      return false;
    }

    seen.add(warning.code);
    return true;
  });
}

function stripTrailingPeriod(value: string): string {
  return cleanSentence(value).replace(/[.]+$/, "");
}

function lowercaseFirst(value: string): string {
  if (!value) {
    return value;
  }

  return value.charAt(0).toLowerCase() + value.slice(1);
}

function capitalizeFirst(value: string): string {
  if (!value) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}
