import { useMemo, useState } from "react";
import { AlertTriangle, Download, Info } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  Tabs,
} from "../../../components/base";
import { availableChartTypes } from "../lib/chart";
import { downloadTextFile } from "../lib/download";
import { formatValue, humanizeHeader, toCSV, toMarkdown } from "../lib/format";
import type { ChartType, QueryEnvelope } from "../types/nl-query.types";
import { ResultChart } from "./ResultChart";
import { ResultTable } from "./ResultTable";

interface QueryResultProps {
  envelope: QueryEnvelope;
}

const CHART_LABELS: Record<ChartType, string> = {
  bar: "กราฟแท่ง",
  line: "กราฟเส้น",
  pie: "กราฟวงกลม",
  scatter: "กราฟกระจาย",
};

export function QueryResult({ envelope }: QueryResultProps) {
  return <QueryResultContent envelope={envelope} key={envelope.request_id} />;
}

function QueryResultContent({ envelope }: QueryResultProps) {
  const rows = envelope.rows ?? [];
  const visualization = envelope.visualization;
  const chartTypes = useMemo(
    () =>
      visualization ? availableChartTypes(visualization, envelope.columns) : [],
    [envelope.columns, visualization],
  );
  const initialChart = chartTypes[0];
  const [pane, setPane] = useState<"chart" | "table">(
    initialChart ? "chart" : "table",
  );
  const [chartType, setChartType] = useState<ChartType | undefined>(
    initialChart,
  );

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-content-secondary">
          ไม่พบข้อมูล (ผลลัพธ์ว่าง)
        </CardContent>
      </Card>
    );
  }

  const aggregate = Object.entries(
    envelope.summary?.numeric_aggregates ?? {},
  )[0];
  const summaryParts = [`${envelope.row_count.toLocaleString("th-TH")} แถว`];
  if (!envelope.summary?.single_value && aggregate) {
    const [name, stats] = aggregate;
    if (stats.sum !== undefined) {
      summaryParts.push(
        `Σ ${humanizeHeader(name)} ${stats.sum.toLocaleString("th-TH")}`,
      );
    }
    if (stats.mean !== undefined) {
      summaryParts.push(
        `เฉลี่ย ${stats.mean.toLocaleString("th-TH", { maximumFractionDigits: 2 })}`,
      );
    }
  }

  const firstColumn = envelope.columns[0];
  const singleValue = envelope.summary?.single_value && firstColumn;
  const exportName = `nl-query-${envelope.request_id || "result"}`;

  return (
    <Card>
      <CardHeader className="gap-4 border-b border-slate-100">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-content-secondary">
            {summaryParts.map((part) => (
              <span key={part}>{part}</span>
            ))}
            {envelope.truncated ? (
              <span className="inline-flex items-center gap-1 font-semibold text-warning-700">
                <AlertTriangle className="size-4" aria-hidden="true" />
                แสดง 500 แถวแรก (ปรับคำถามให้แคบลง)
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              icon={Download}
              onClick={() =>
                downloadTextFile(
                  `\uFEFF${toCSV(rows, envelope.columns)}`,
                  `${exportName}.csv`,
                  "text/csv;charset=utf-8",
                )
              }
              size="sm"
              variant="outline"
            >
              Export CSV
            </Button>
            <Button
              icon={Download}
              onClick={() =>
                downloadTextFile(
                  toMarkdown(rows, envelope.columns),
                  `${exportName}.md`,
                  "text/markdown;charset=utf-8",
                )
              }
              size="sm"
              variant="outline"
            >
              Export Markdown
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {singleValue ? (
          <div className="flex min-h-48 flex-col items-center justify-center rounded-lg bg-surface-soft px-6 py-10 text-center">
            <span className="text-5xl font-bold tabular-nums text-primary sm:text-6xl">
              {formatValue(
                rows[0][firstColumn.name],
                firstColumn.semantic_type,
              )}
            </span>
            <span className="mt-3 text-base text-content-secondary">
              {humanizeHeader(firstColumn.name)}
            </span>
          </div>
        ) : chartType && visualization ? (
          <div>
            {visualization.title ? (
              <CardTitle as="h3" className="mb-3">
                {visualization.title}
              </CardTitle>
            ) : null}
            <div className="mb-4 flex flex-col justify-between gap-3 border-b border-slate-200 sm:flex-row sm:items-end">
              <Tabs
                aria-label="รูปแบบผลลัพธ์"
                onChange={(value) => setPane(value as "chart" | "table")}
                options={[
                  { label: "กราฟ", value: "chart" },
                  { label: "ตาราง", value: "table" },
                ]}
                value={pane}
              />
              {pane === "chart" ? (
                <Select
                  aria-label="ชนิดกราฟ"
                  className="mb-2 min-w-40"
                  onChange={(event) =>
                    setChartType(event.target.value as ChartType)
                  }
                  value={chartType}
                >
                  {chartTypes.map((type) => (
                    <option key={type} value={type}>
                      {CHART_LABELS[type]}
                    </option>
                  ))}
                </Select>
              ) : null}
            </div>
            {visualization.reason ? (
              <p className="mb-4 flex items-start gap-2 text-sm text-content-secondary">
                <Info
                  className="mt-0.5 size-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                {visualization.reason}
              </p>
            ) : null}
            {pane === "chart" ? (
              <ResultChart
                chartType={chartType}
                columns={envelope.columns}
                rows={rows}
                visualization={visualization}
              />
            ) : (
              <ResultTable columns={envelope.columns} rows={rows} />
            )}
          </div>
        ) : (
          <ResultTable columns={envelope.columns} rows={rows} />
        )}
      </CardContent>
    </Card>
  );
}
