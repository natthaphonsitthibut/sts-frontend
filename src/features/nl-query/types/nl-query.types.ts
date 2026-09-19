export type SemanticType =
  | "count"
  | "number"
  | "percent"
  | "gpa"
  | "date"
  | "id"
  | "category"
  | "name"
  | "text";

export type ChartType = "bar" | "line" | "pie" | "scatter";
export type VisualizationType = ChartType | "table" | "none";
export type AnswerType = "result" | "clarification" | "refusal";

export interface QueryColumn {
  name: string;
  type: string;
  numeric: boolean;
  semantic_type: SemanticType;
}

export interface QueryVisualization {
  chart_type: VisualizationType;
  x_col: string | null;
  y_col: string | null;
  series_col: string | null;
  options: string[];
  title: string | null;
  x_label: string | null;
  y_label: string | null;
  top_n: number | null;
  reason: string | null;
}

export interface QueryEnvelope {
  status: "ok" | "error";
  request_id: string;
  question: string;
  answer_type?: AnswerType;
  message: string | null;
  steps_used?: number;
  sql: string | null;
  columns: QueryColumn[];
  rows: Record<string, unknown>[] | null;
  row_count: number;
  truncated: boolean;
  summary: {
    row_count: number;
    truncated: boolean;
    numeric_aggregates: Record<
      string,
      { sum?: number; min?: number; max?: number; mean?: number }
    >;
    single_value: boolean;
  } | null;
  visualization: QueryVisualization | null;
  retry_count: number;
  elapsed_ms: number;
  error: { code: string; message: string } | null;
}

export interface PriorTurnDto {
  question: string;
  answerType: AnswerType;
  sql: string | null;
  rowCount: number | null;
}

export type UiTurn = PriorTurnDto;

export interface TurnLogEntry {
  question: string;
  envelope: QueryEnvelope;
}

export interface NlQueryPayload {
  question: string;
  preferredChartType?: ChartType;
  history?: UiTurn[];
}

export interface NlQuerySchema {
  [key: string]: unknown;
}
