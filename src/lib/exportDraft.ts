import { FIELD_ORDER } from "./constants";
import type { AppFieldsState, ExportPayload, SourceInput } from "../types";

export function buildExportPayload(source: SourceInput, fields: AppFieldsState): ExportPayload {
  return {
    source,
    fields: FIELD_ORDER.reduce<ExportPayload["fields"]>((accumulator, key) => {
      const field = fields[key];
      accumulator[key] = {
        value: field?.value ?? "",
        status: field?.status ?? "draft",
        confidence: field?.confidence,
        snippets: field?.snippets ?? [],
      };
      return accumulator;
    }, {} as ExportPayload["fields"]),
    meta: {
      exported_at: new Date().toISOString(),
      app_version: "react-ts-mvp",
    },
  };
}

export function downloadExportPayload(payload: ExportPayload): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `easy-fevir-draft-${new Date().toISOString().replaceAll(":", "-")}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
