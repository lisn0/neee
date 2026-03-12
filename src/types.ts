import type {
  DraftField,
  FieldKey,
  FieldStatus,
  Snippet,
  SourceInput,
  SourceType,
  WarningItem,
} from "../shared/easy-fevir-engine";

export type {
  DraftField,
  FieldKey,
  FieldStatus,
  Snippet,
  SourceInput,
  SourceType,
  WarningItem,
};

export type AppFieldsState = Partial<Record<FieldKey, DraftField>>;

export type ExportPayload = {
  source: SourceInput;
  fields: Record<
    FieldKey,
    {
      value: string;
      status: FieldStatus;
      confidence?: number;
      snippets: Snippet[];
    }
  >;
  meta: {
    exported_at: string;
    app_version: string;
  };
};
