import { BarChartIcon } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { Card } from "../../../components/base";
import type { HomeDashboardFilters } from "../types/home-dashboard.types";

interface MonthlySuccessRateChartProps {
  data: { month: string; opened: number; resolved: number }[];
  filters?: HomeDashboardFilters;
}

function formatMonth(monthStr: string) {
  // monthStr is 'YYYY-MM'
  const [year, month] = monthStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return new Intl.DateTimeFormat("th-TH", {
    month: "short",
    year: "2-digit",
  }).format(date);
}

export function MonthlySuccessRateChart({
  data,
}: MonthlySuccessRateChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    label: formatMonth(d.month),
  }));

  const totalOpened = data.reduce((sum, d) => sum + d.opened, 0);
  const totalResolved = data.reduce((sum, d) => sum + d.resolved, 0);
  const totalCases = totalOpened + totalResolved;

  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
          <BarChartIcon className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            อัตราการช่วยเหลือสำเร็จ (1 ปีย้อนหลัง)
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {totalCases > 0
              ? `เคสเปิดใหม่ ${totalOpened.toLocaleString(
                  "th-TH",
                )} รายการ และสำเร็จ ${totalResolved.toLocaleString(
                  "th-TH",
                )} รายการ`
              : "ไม่มีข้อมูลในขอบเขตปัจจุบัน"}
          </p>
        </div>
      </div>

      <div className="mt-6 h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e2e8f0"
            />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#64748b" }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#64748b" }}
            />
            <Tooltip
              cursor={{ fill: "#f1f5f9" }}
              contentStyle={{
                borderRadius: "8px",
                border: "none",
                boxShadow:
                  "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
                fontSize: "14px",
              }}
              formatter={(value, name) => [
                `${Number(value ?? 0).toLocaleString("th-TH")} เคส`,
                name === "opened" ? "เคสที่เกิดขึ้นใหม่" : "ช่วยเหลือสำเร็จ",
              ]}
              labelFormatter={(label) => `เดือน ${label}`}
            />
            <Legend
              wrapperStyle={{ paddingTop: "20px" }}
              formatter={(value) => (
                <span className="text-slate-700">
                  {value === "opened"
                    ? "เคสที่เกิดขึ้นใหม่"
                    : "ช่วยเหลือสำเร็จ"}
                </span>
              )}
            />
            <Bar
              dataKey="opened"
              name="opened"
              fill="#ef4444" // red-500
              radius={[4, 4, 0, 0]}
              barSize={32}
            />
            <Bar
              dataKey="resolved"
              name="resolved"
              fill="#10b981" // emerald-500
              radius={[4, 4, 0, 0]}
              barSize={32}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
