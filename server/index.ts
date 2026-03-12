import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import {
  createErrorResponse,
  runExtract,
  runRegenerateField,
} from "./extraction-service";
import {
  buildDraftSummary,
  getDraftById,
  getLatestDraft,
  listDrafts,
  saveDraft,
} from "./draft-store";
import { getOpenAiConfig } from "./openai-extractor";
import type { ExtractRequest, RegenerateFieldRequest } from "../shared/easy-fevir-engine";
import type {
  SaveDraftRequest,
} from "../shared/easy-fevir-drafts";

const PORT = Number(process.env.PORT ?? 8787);
const EXTRACTION_MODE = process.env.EASY_FEVIR_EXTRACTION_MODE ?? "auto";

const server = createServer(async (request, response) => {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (request.method === "OPTIONS") {
    response.writeHead(204).end();
    return;
  }

  if (request.method === "GET" && request.url === "/api/health") {
    const openAi = getOpenAiConfig();
    const latestDraft = await getLatestDraft();

    sendJson(response, 200, {
      status: "ok",
      service: "easy-fevir-api",
      extraction_mode: EXTRACTION_MODE,
      llm: {
        provider: "openai",
        configured: openAi.configured,
        model: openAi.model,
        prompt_version: openAi.promptVersion,
      },
      persistence: {
        backend_store: "file",
        has_saved_drafts: Boolean(latestDraft),
      },
      generated_at: new Date().toISOString(),
    });
    return;
  }

  if (request.method === "POST" && request.url === "/api/v1/extract") {
    try {
      const payload = (await readJson<ExtractRequest>(request)) ?? ({} as ExtractRequest);
      sendJson(response, 200, await runExtract(payload));
    } catch (error) {
      const formatted = createErrorResponse(error);
      sendJson(response, formatted.status, formatted.body);
    }
    return;
  }

  if (request.method === "POST" && request.url === "/api/v1/regenerate-field") {
    try {
      const payload = (await readJson<RegenerateFieldRequest>(request)) ?? ({} as RegenerateFieldRequest);
      sendJson(response, 200, await runRegenerateField(payload));
    } catch (error) {
      const formatted = createErrorResponse(error);
      sendJson(response, formatted.status, formatted.body);
    }
    return;
  }

  if (request.method === "GET" && request.url === "/api/v1/drafts/latest") {
    try {
      const draft = await getLatestDraft();

      if (!draft) {
        sendJson(response, 404, {
          error: {
            code: "DRAFT_NOT_FOUND",
            message: "No saved draft found",
            details: [],
          },
        });
        return;
      }

      sendJson(response, 200, { draft });
    } catch (error) {
      const formatted = createErrorResponse(error);
      sendJson(response, formatted.status, formatted.body);
    }
    return;
  }

  if (request.method === "GET" && request.url?.startsWith("/api/v1/drafts/")) {
    try {
      const draftId = request.url.split("/").pop()?.trim();
      if (!draftId) {
        throw new Error("draft_id missing");
      }

      const draft = await getDraftById(draftId);
      if (!draft) {
        sendJson(response, 404, {
          error: {
            code: "DRAFT_NOT_FOUND",
            message: `No draft found for ${draftId}`,
            details: [],
          },
        });
        return;
      }

      sendJson(response, 200, { draft });
    } catch (error) {
      const formatted = createErrorResponse(error);
      sendJson(response, formatted.status, formatted.body);
    }
    return;
  }

  if (request.method === "GET" && request.url?.startsWith("/api/v1/drafts")) {
    try {
      const url = new URL(request.url, `http://127.0.0.1:${PORT}`);
      const limit = Number(url.searchParams.get("limit") ?? 10);
      sendJson(response, 200, { drafts: await listDrafts(limit) });
    } catch (error) {
      const formatted = createErrorResponse(error);
      sendJson(response, formatted.status, formatted.body);
    }
    return;
  }

  if (request.method === "POST" && request.url === "/api/v1/drafts") {
    try {
      const payload = (await readJson<SaveDraftRequest>(request)) ?? ({} as SaveDraftRequest);
      const draft = await saveDraft(payload);
      sendJson(response, 200, {
        draft,
        summary: buildDraftSummary(draft),
      });
    } catch (error) {
      const formatted = createErrorResponse(error);
      sendJson(response, formatted.status, formatted.body);
    }
    return;
  }

  sendJson(response, 404, {
    error: {
      code: "NOT_FOUND",
      message: `No route for ${request.method ?? "UNKNOWN"} ${request.url ?? "/"}`,
      details: [],
    },
  });
});

server.listen(PORT, "127.0.0.1", () => {
  process.stdout.write(`Easy FEvIR API listening on http://127.0.0.1:${PORT}\n`);
});

function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, {
    "Content-Type": "application/json",
  });
  response.end(JSON.stringify(body));
}

async function readJson<T>(request: IncomingMessage): Promise<T | undefined> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return undefined;
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  return raw ? (JSON.parse(raw) as T) : undefined;
}
