import { mkdir, appendFile } from "node:fs/promises";
import path from "node:path";

const LOG_DIR = path.resolve(process.cwd(), process.env.EASY_FEVIR_LOG_DIR ?? "logs");
const LOG_FILE = path.join(LOG_DIR, "llm-extraction-events.jsonl");

type ExtractionLogEvent = {
  timestamp: string;
  route: "extract" | "regenerate-field";
  mode_requested: string;
  mode_used: string;
  model?: string;
  request_id?: string;
  duration_ms: number;
  fallback_reason?: string;
  source: {
    type: string;
    title?: string;
    source_id?: string;
    length: number;
    preview: string;
  };
  quality: Record<string, unknown>;
  llm?: Record<string, unknown>;
  error?: {
    code?: string;
    message: string;
  };
};

export async function logExtractionEvent(event: ExtractionLogEvent): Promise<void> {
  await mkdir(LOG_DIR, { recursive: true });
  await appendFile(LOG_FILE, `${JSON.stringify(event)}\n`, "utf8");
}
