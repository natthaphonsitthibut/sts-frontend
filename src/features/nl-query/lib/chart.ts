import type {
  ChartType,
  QueryColumn,
  QueryVisualization,
} from "../types/nl-query.types";

export const CHART_COLORS = [
  "#0f49bd",
  "#f5740b",
  "#7324ce",
  "#0d9488",
  "#b7791f",
  "#ba1a1a",
  "#4652ad",
  "#525252",
];

const CHART_OPTION_NAMES: Record<string, ChartType> = {
  bar: "bar",
  "bar chart": "bar",
  line: "line",
  "line chart": "line",
  pie: "pie",
  "pie chart": "pie",
  scatter: "scatter",
  "scatter chart": "scatter",
  "scatter plot": "scatter",
};

export function numericValueColumns(columns: QueryColumn[]): QueryColumn[] {
  return columns.filter(
    (column) => column.numeric && column.semantic_type !== "id",
  );
}

export function canRenderChart(
  type: ChartType,
  visualization: QueryVisualization,
  columns: QueryColumn[],
): boolean {
  if (type === "scatter") return numericValueColumns(columns).length >= 2;
  const x = columns.find((column) => column.name === visualization.x_col);
  const y = columns.find((column) => column.name === visualization.y_col);
  return Boolean(x && y?.numeric && y.semantic_type !== "id");
}

export function availableChartTypes(
  visualization: QueryVisualization,
  columns: QueryColumn[],
): ChartType[] {
  if (
    visualization.chart_type === "table" ||
    visualization.chart_type === "none"
  ) {
    return [];
  }
  const requested = visualization.options
    .map((option) => CHART_OPTION_NAMES[option.trim().toLowerCase()])
    .filter((type): type is ChartType => Boolean(type));
  if (["bar", "line", "pie", "scatter"].includes(visualization.chart_type)) {
    requested.unshift(visualization.chart_type as ChartType);
  }

  return Array.from(new Set(requested)).filter((type) =>
    canRenderChart(type, visualization, columns),
  );
}

export function applyTopN(
  visualization: QueryVisualization,
  rows: Record<string, unknown>[],
): Record<string, unknown>[] {
  const {
    chart_type: type,
    series_col: series,
    top_n: topN,
    x_col: x,
    y_col: y,
  } = visualization;
  if (!topN || series || !x || !y || (type !== "bar" && type !== "pie")) {
    return rows;
  }
  if (rows.length <= topN) return rows;

  const sorted = [...rows].sort(
    (left, right) => (Number(right[y]) || 0) - (Number(left[y]) || 0),
  );
  const tail = sorted.slice(topN);
  return [
    ...sorted.slice(0, topN),
    {
      [x]: `อื่น ๆ (${tail.length})`,
      [y]: tail.reduce((sum, row) => sum + (Number(row[y]) || 0), 0),
    },
  ];
}
