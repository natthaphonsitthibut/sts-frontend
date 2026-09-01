import { useEffect, useMemo, useRef } from "react";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartOptions,
} from "chart.js";
import { Bar, Doughnut, Line, Scatter } from "react-chartjs-2";
import { Download } from "lucide-react";
import { Button } from "../../../components/base";
import { applyTopN, CHART_COLORS, numericValueColumns } from "../lib/chart";
import { formatAxisValue } from "../lib/format";
import type {
  ChartType,
  QueryColumn,
  QueryVisualization,
} from "../types/nl-query.types";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
);

interface ResultChartProps {
  chartType: ChartType;
  columns: QueryColumn[];
  rows: Record<string, unknown>[];
  visualization: QueryVisualization;
}

function semanticType(columns: QueryColumn[], name: string | null) {
  return (
    columns.find((column) => column.name === name)?.semantic_type ?? "number"
  );
}

export function ResultChart({
  chartType,
  columns,
  rows,
  visualization,
}: ResultChartProps) {
  const chartRef = useRef<ChartJS | null>(null);
  const preparedRows = useMemo(
    () => applyTopN({ ...visualization, chart_type: chartType }, rows),
    [chartType, rows, visualization],
  );
  const ySemanticType = semanticType(columns, visualization.y_col);

  useEffect(() => {
    chartRef.current?.resize();
  }, [chartType]);

  function downloadPng(): void {
    const href = chartRef.current?.toBase64Image();
    if (!href) return;
    const link = document.createElement("a");
    link.href = href;
    link.download = `${(visualization.title || "chart").slice(0, 40)}.png`;
    link.click();
  }

  const x = visualization.x_col ?? "";
  const y = visualization.y_col ?? "";
  const labels = preparedRows.map((row) => String(row[x] ?? "—"));
  const commonLegend = {
    labels: { usePointStyle: true, boxWidth: 8, color: "#404040" },
  };

  function seriesDatasets() {
    if (!visualization.series_col) return null;
    const seriesName = visualization.series_col;
    const xValues = Array.from(new Set(preparedRows.map((row) => row[x])));
    const seriesValues = Array.from(
      new Set(preparedRows.map((row) => row[seriesName])),
    );
    return {
      labels: xValues.map((value) => String(value ?? "—")),
      datasets: seriesValues.map((seriesValue, index) => ({
        label: `${seriesName}: ${String(seriesValue ?? "—")}`,
        data: xValues.map((xValue) => {
          const row = preparedRows.find(
            (candidate) =>
              candidate[x] === xValue && candidate[seriesName] === seriesValue,
          );
          return row ? Number(row[y]) : null;
        }),
        backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
        borderColor: CHART_COLORS[index % CHART_COLORS.length],
      })),
    };
  }

  const grouped = seriesDatasets();
  const axisTitle = (label: string | null) => ({
    display: Boolean(label),
    text: label ?? undefined,
    color: "#525252",
  });

  let chart: React.ReactNode;
  if (chartType === "scatter") {
    const numeric = numericValueColumns(columns);
    const xColumn = numeric.find((column) => column.name === x) ?? numeric[0];
    const yColumn = numeric.find((column) => column.name === y) ?? numeric[1];
    const scatterOptions: ChartOptions<"scatter"> = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) =>
              `(${formatAxisValue(context.parsed.x, xColumn.semantic_type)}, ${formatAxisValue(context.parsed.y, yColumn.semantic_type)})`,
          },
        },
      },
      scales: {
        x: { title: axisTitle(visualization.x_label ?? xColumn.name) },
        y: { title: axisTitle(visualization.y_label ?? yColumn.name) },
      },
    };
    chart = (
      <Scatter
        data={{
          datasets: [
            {
              label: `${xColumn.name} × ${yColumn.name}`,
              data: preparedRows.map((row) => ({
                x: Number(row[xColumn.name]),
                y: Number(row[yColumn.name]),
              })),
              backgroundColor: CHART_COLORS[0],
              pointHoverRadius: 6,
              pointRadius: 4,
            },
          ],
        }}
        options={scatterOptions}
        ref={(instance) => {
          chartRef.current = instance ?? null;
        }}
      />
    );
  } else if (chartType === "pie") {
    const pieOptions: ChartOptions<"doughnut"> = {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "55%",
      plugins: {
        legend: { ...commonLegend, position: "right" },
        tooltip: {
          callbacks: {
            label: (context) => {
              const values = context.dataset.data.map(Number);
              const total = values.reduce((sum, value) => sum + value, 0);
              const value = Number(context.parsed);
              const percentage = total
                ? ((value / total) * 100).toFixed(1)
                : "0.0";
              return `${context.label}: ${formatAxisValue(value, ySemanticType)} (${percentage}%)`;
            },
          },
        },
      },
    };
    chart = (
      <Doughnut
        data={{
          labels,
          datasets: [
            {
              data: preparedRows.map((row) => Number(row[y]) || 0),
              backgroundColor: CHART_COLORS,
              borderColor: "#ffffff",
              borderWidth: 2,
            },
          ],
        }}
        options={pieOptions}
        ref={(instance) => {
          chartRef.current = instance ?? null;
        }}
      />
    );
  } else if (chartType === "line") {
    const lineData = grouped ?? {
      labels,
      datasets: [
        {
          label: visualization.y_label ?? y,
          data: preparedRows.map((row) => Number(row[y]) || 0),
          backgroundColor: "rgba(15, 73, 189, 0.14)",
          borderColor: CHART_COLORS[0],
        },
      ],
    };
    lineData.datasets.forEach((dataset) => {
      Object.assign(dataset, {
        borderWidth: 2.5,
        fill: !visualization.series_col,
        pointHoverRadius: 6,
        pointRadius: lineData.labels.length > 30 ? 0 : 3,
        tension: 0.35,
      });
    });
    const lineOptions: ChartOptions<"line"> = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { ...commonLegend, display: Boolean(visualization.series_col) },
      },
      scales: {
        x: {
          grid: { display: false },
          title: axisTitle(visualization.x_label),
        },
        y: {
          title: axisTitle(visualization.y_label),
          ticks: { callback: (value) => formatAxisValue(value, ySemanticType) },
        },
      },
    };
    chart = (
      <Line
        data={lineData}
        options={lineOptions}
        ref={(instance) => {
          chartRef.current = instance ?? null;
        }}
      />
    );
  } else {
    const barData = grouped ?? {
      labels,
      datasets: [
        {
          label: visualization.y_label ?? y,
          data: preparedRows.map((row) => Number(row[y]) || 0),
          backgroundColor: CHART_COLORS[0],
        },
      ],
    };
    barData.datasets.forEach((dataset) => {
      Object.assign(dataset, { borderRadius: 6, maxBarThickness: 48 });
    });
    const horizontal = !visualization.series_col && barData.labels.length > 8;
    const barOptions: ChartOptions<"bar"> = {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: horizontal ? "y" : "x",
      plugins: {
        legend: { ...commonLegend, display: Boolean(visualization.series_col) },
      },
      scales: horizontal
        ? {
            x: {
              title: axisTitle(visualization.y_label),
              ticks: {
                callback: (value) => formatAxisValue(value, ySemanticType),
              },
            },
            y: {
              grid: { display: false },
              title: axisTitle(visualization.x_label),
            },
          }
        : {
            x: {
              grid: { display: false },
              title: axisTitle(visualization.x_label),
            },
            y: {
              title: axisTitle(visualization.y_label),
              ticks: {
                callback: (value) => formatAxisValue(value, ySemanticType),
              },
            },
          },
    };
    chart = (
      <Bar
        data={barData}
        options={barOptions}
        ref={(instance) => {
          chartRef.current = instance ?? null;
        }}
      />
    );
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button
          icon={Download}
          onClick={downloadPng}
          size="sm"
          variant="outline"
        >
          ดาวน์โหลด PNG
        </Button>
      </div>
      <div className="relative h-[360px] w-full sm:h-[440px]">{chart}</div>
    </div>
  );
}
