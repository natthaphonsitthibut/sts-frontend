import type { QueryColumn, SemanticType } from "../types/nl-query.types";

const NF0 = new Intl.NumberFormat("th-TH");
const NF2 = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 });

export function formatValue(value: unknown, type: SemanticType): string {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(value);

  switch (type) {
    case "count":
      return Number.isFinite(number) ? NF0.format(number) : String(value);
    case "number":
      return Number.isFinite(number) ? NF2.format(number) : String(value);
    case "percent":
      return Number.isFinite(number) ? `${number.toFixed(1)}%` : String(value);
    case "gpa":
      return Number.isFinite(number) ? number.toFixed(2) : String(value);
    case "date":
      return String(value).slice(0, 10);
    case "id":
      return String(value);
    default:
      return String(value);
  }
}

export function isRightAligned(column: {
  numeric: boolean;
  semantic_type: SemanticType;
}): boolean {
  return column.numeric && column.semantic_type !== "id";
}

export function humanizeHeader(name: string): string {
  return name.replace(/_/g, " ");
}

export function formatAxisValue(value: unknown, type: SemanticType): string {
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return type === "percent" ? `${NF2.format(number)}%` : NF2.format(number);
}

function columnNames(
  rows: Record<string, unknown>[],
  columns?: QueryColumn[],
): string[] {
  return columns?.length
    ? columns.map((column) => column.name)
    : Object.keys(rows[0] ?? {});
}

export function toCSV(
  rows: Record<string, unknown>[],
  columns?: QueryColumn[],
): string {
  if (!rows.length) return "";
  const headers = columnNames(rows, columns);
  const escape = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  return [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((header) => escape(row[header])).join(","),
    ),
  ].join("\n");
}

export function toMarkdown(
  rows: Record<string, unknown>[],
  columns?: QueryColumn[],
): string {
  if (!rows.length) return "";
  const headers = columnNames(rows, columns);
  const escape = (value: unknown): string =>
    value === null || value === undefined
      ? ""
      : String(value).replace(/\|/g, "\\|").replace(/\n/g, " ");
  const line = (cells: string[]): string => `| ${cells.join(" | ")} |`;

  return [
    line(headers),
    line(headers.map(() => "---")),
    ...rows.map((row) => line(headers.map((header) => escape(row[header])))),
  ].join("\n");
}
