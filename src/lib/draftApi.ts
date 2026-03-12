import type {
  DraftSummary,
  GetDraftResponse,
  ListDraftsResponse,
  SaveDraftRequest,
  SaveDraftResponse,
} from "../../shared/easy-fevir-drafts";
import { ApiClientError } from "./api";

export async function saveDraftViaApi(payload: SaveDraftRequest): Promise<SaveDraftResponse> {
  return sendJson<SaveDraftResponse>("/api/v1/drafts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function loadLatestDraftViaApi(): Promise<GetDraftResponse> {
  return sendJson<GetDraftResponse>("/api/v1/drafts/latest");
}

export async function listDraftsViaApi(limit = 10): Promise<DraftSummary[]> {
  const response = await sendJson<ListDraftsResponse>(`/api/v1/drafts?limit=${limit}`);
  return response.drafts;
}

async function sendJson<T>(
  url: string,
  init?: {
    method?: "GET" | "POST";
    body?: string;
  },
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, {
      method: init?.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
      },
      body: init?.body,
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
