import { CalendarDays } from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard, ChartEmptyState } from "./ChartCard";
import type { HomeDashboardTrendPoint } from "../types/home-dashboard.types";

interface AttendanceTrendChartProps {
  points: HomeDashboardTrendPoint[];
}

const SERIES_LABELS: Record<string, string> = {
  absent: "ขาดเรียน",
  late: "มาสาย",
  attendanceRate: "อัตรามาเรียน",
};

function formatDay(key: string): string {
  const date = new Date(`${key}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? key
    : new Intl.DateTimeFormat("th-TH", {
        day: "numeric",
        month: "short",
      }).format(date);
}

/**
 * The day-by-day picture a single school actually works from. Present days are
 * left to the rate line — plotting them as bars would flatten ขาด/สาย, which are
 * the two numbers anyone acts on.
 */
export function AttendanceTrendChart({ points }: AttendanceTrendChartProps) {
  const data = points.map((point) => ({
    ...point,
    label: formatDay(point.key),
  }));
  const totalAbsent = points.reduce((sum, point) => sum + point.absent, 0);
  const totalLate = points.reduce((sum, point) => sum + point.late, 0);

  return (
    <ChartCard
      description={
        points.length > 0
          ? `ในช่วงที่เลือก ขาดเรียนรวม ${totalAbsent.toLocaleString("th-TH")} ครั้ง และมาสายรวม ${totalLate.toLocaleString("th-TH")} ครั้ง`
          : "ยังไม่มีการเช็กชื่อในช่วงเวลาที่เลือก"
      }
      icon={CalendarDays}
      testAttribute={{ "data-attendance-trend": "true" }}
      title="แนวโน้มการมาเรียนรายวัน"
    >
      {data.length === 0 ? (
        <ChartEmptyState message="ไม่มีข้อมูลการเช็กชื่อในขอบเขตและช่วงเวลานี้" />
      ) : (
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
            >
              <CartesianGrid
                stroke="var(--color-slate-200)"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                axisLine={false}
                dataKey="label"
                tick={{ fontSize: 12, fill: "var(--color-slate-500)" }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "var(--color-slate-500)" }}
                tickLine={false}
                yAxisId="count"
              />
              <YAxis
                axisLine={false}
                domain={[0, 100]}
                orientation="right"
                tick={{ fontSize: 12, fill: "var(--color-slate-500)" }}
                tickLine={false}
                unit="%"
                yAxisId="rate"
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "var(--radius-lg)",
                  border: "none",
                  boxShadow: "var(--shadow-card)",
                  fontSize: "14px",
                }}
                cursor={{ fill: "var(--color-slate-100)" }}
                formatter={(value, name) => [
                  name === "attendanceRate"
                    ? `${Number(value ?? 0).toLocaleString("th-TH")}%`
                    : `${Number(value ?? 0).toLocaleString("th-TH")} คน`,
                  SERIES_LABELS[String(name)] ?? name,
                ]}
                labelFormatter={(label) => `วันที่ ${label}`}
              />
              <Legend
                formatter={(value) => (
                  <span className="text-slate-700">
                    {SERIES_LABELS[String(value)] ?? value}
                  </span>
                )}
                wrapperStyle={{ paddingTop: "12px" }}
              />
              <Bar
                dataKey="absent"
                fill="var(--color-danger)"
                name="absent"
                radius={[4, 4, 0, 0]}
                yAxisId="count"
              />
              <Bar
                dataKey="late"
                fill="var(--color-warning)"
                name="late"
                radius={[4, 4, 0, 0]}
                yAxisId="count"
              />
              <Line
                dataKey="attendanceRate"
                dot={false}
                name="attendanceRate"
                stroke="var(--color-chart-1)"
                strokeWidth={2}
                type="monotone"
                yAxisId="rate"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
