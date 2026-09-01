import { describe, expect, it } from "vitest";
import { applyTopN, availableChartTypes } from "./chart";
import type { QueryColumn, QueryVisualization } from "../types/nl-query.types";

const columns: QueryColumn[] = [
  { name: "school", type: "str", numeric: false, semantic_type: "name" },
  { name: "count", type: "int", numeric: true, semantic_type: "count" },
  { name: "gpa", type: "float", numeric: true, semantic_type: "gpa" },
];

const visualization: QueryVisualization = {
  chart_type: "bar",
  x_col: "school",
  y_col: "count",
  series_col: null,
  options: ["Bar Chart", "Pie Chart", "Area Chart", "Scatter Plot"],
  title: null,
  x_label: null,
  y_label: null,
  top_n: 2,
  reason: null,
};

describe("NL query chart preparation", () => {
  it("only offers supported and renderable advisory chart types", () => {
    expect(availableChartTypes(visualization, columns)).toEqual([
      "bar",
      "pie",
      "scatter",
    ]);
  });

  it("keeps table-only recommendations as a table", () => {
    expect(
      availableChartTypes({ ...visualization, chart_type: "table" }, columns),
    ).toEqual([]);
  });

  it("folds rows after top N into an aggregate other category", () => {
    expect(
      applyTopN(visualization, [
        { school: "A", count: 2 },
        { school: "B", count: 8 },
        { school: "C", count: 5 },
        { school: "D", count: 1 },
      ]),
    ).toEqual([
      { school: "B", count: 8 },
      { school: "C", count: 5 },
      { school: "อื่น ๆ (2)", count: 3 },
    ]);
  });
});
