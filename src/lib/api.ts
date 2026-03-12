import {
  type ExtractRequest,
  type ExtractResponse,
  type RegenerateFieldRequest,
  type RegenerateFieldResponse,
} from "../../shared/easy-fevir-engine";

export class ApiClientError extends Error {
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
    this.name = "ApiClientError";
    this.code = params.code;
    this.status = params.status;
    this.details = params.details;
  }
}

export async function extractDraftViaApi(payload: ExtractRequest): Promise<ExtractResponse> {
  return postJson<ExtractResponse>("/api/v1/extract", payload);
}

export async function regenerateFieldViaApi(
  payload: RegenerateFieldRequest,
): Promise<RegenerateFieldResponse> {
  return postJson<RegenerateFieldResponse>("/api/v1/regenerate-field", payload);
}

async function postJson<T>(url: string, payload: unknown): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new ApiClientError({
      code: "API_UNAVAILABLE",
      message: "API unavailable. Start the backend with `npm run dev:api` or `npm run dev:full`.",
      status: 503,
    });
  }

  const data = (await response.json()) as
    | T
    | {
        error?: {
          code: string;
          message: string;
          details?: Array<{ field: string; message: string }>;
        };
      };

  if (!response.ok) {
    const error =
      data && typeof data === "object" && "error" in data && data.error ? data.error : undefined;
    throw new ApiClientError({
      code: error?.code ?? "REQUEST_FAILED",
      message: error?.message ?? "Request failed",
      status: response.status,
      details: error?.details,
    });
  }

  return data as T;
}
