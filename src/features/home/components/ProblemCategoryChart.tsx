import { memo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartEmptyState, PanelSection } from "./ChartCard";
import type { HomeDashboardProblemCategoryPoint } from "../types/home-dashboard.types";

interface ProblemCategoryChartProps {
  categories: HomeDashboardProblemCategoryPoint[];
  otherDetails: string[];
}

const SERIES = [
  {
    key: "followUp" as const,
    label: "จากผลการติดตาม",
    fill: "var(--color-chart-1)",
  },
  {
    key: "observation" as const,
    label: "จากข้อสังเกตครูประจำชั้น",
    fill: "var(--color-chart-2)",
  },
];

/**
 * เสี่ยงเรื่องอะไร นับเป็นจำนวนนักเรียน. The two sources stay side by side rather
 * than summed: a follow-up visit and a homeroom note are different evidence, and
 * one student can appear in both.
 */
function ProblemCategoryChartImpl({ categories }: ProblemCategoryChartProps) {
  const totalStudents = categories.reduce(
    (sum, category) => sum + category.total,
    0,
  );

  return (
    <PanelSection
      description={
        totalStudents > 0
          ? "นับนักเรียน 1 คนต่อ 1 ครั้งจากบันทึกล่าสุดของแต่ละแหล่ง ไม่ใช่จำนวนใบรายงาน"
          : "ยังไม่มีผลการติดตามหรือข้อสังเกตที่ระบุประเภทปัญหาในขอบเขตนี้"
      }
      title="ประเภทปัญหาที่พบในนักเรียน"
    >
      <div data-problem-categories="true">
        {categories.length === 0 ? (
          <ChartEmptyState message="ไม่มีข้อมูลประเภทปัญหาในขอบเขตปัจจุบัน" />
        ) : (
          <>
            <div
              className="hidden w-full sm:block"
              style={{ height: Math.max(240, categories.length * 44 + 72) }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  barGap={4}
                  data={categories}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
                >
                  <CartesianGrid
                    horizontal={false}
                    stroke="var(--color-slate-200)"
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    allowDecimals={false}
                    axisLine={false}
                    tick={{
                      fontSize: "var(--text-sm)",
                      fill: "var(--color-slate-700)",
                    }}
                    tickLine={false}
                    type="number"
                  />
                  <YAxis
                    axisLine={false}
                    dataKey="label"
                    interval={0}
                    tick={{
                      fontSize: "var(--text-sm)",
                      fill: "var(--color-slate-800)",
                    }}
                    tickLine={false}
                    type="category"
                    width={200}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--color-slate-100)" }}
                    contentStyle={{
                      borderRadius: "var(--radius-lg)",
                      border: "none",
                      boxShadow: "var(--shadow-card)",
                      fontSize: "var(--text-sm)",
                    }}
                    formatter={(value, name) => [
                      `${Number(value ?? 0).toLocaleString("th-TH")} คน`,
                      SERIES.find((series) => series.key === name)?.label ??
                        name,
                    ]}
                  />
                  <Legend
                    formatter={(value) => (
                      <span className="text-slate-700">
                        {SERIES.find((series) => series.key === value)?.label ??
                          value}
                      </span>
                    )}
                    wrapperStyle={{
                      paddingTop: "12px",
                      fontSize: "var(--text-sm)",
                    }}
                  />
                  {SERIES.map((series) => (
                    <Bar
                      barSize={8}
                      dataKey={series.key}
                      fill={series.fill}
                      key={series.key}
                      name={series.key}
                      radius={[0, 4, 4, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4">
              {categories.map((category) => (
                <li
                  className="flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3"
                  key={category.key}
                >
                  <span className="break-words text-sm font-semibold text-slate-800">
                    {category.label}
                  </span>
                  <span className="shrink-0 text-sm tabular-nums text-slate-700">
                    ติดตาม{" "}
                    <b className="text-slate-900">
                      {category.followUp.toLocaleString("th-TH")}
                    </b>{" "}
                    · ครูบันทึก{" "}
                    <b className="text-slate-900">
                      {category.observation.toLocaleString("th-TH")}
                    </b>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </PanelSection>
  );
}

export const ProblemCategoryChart = memo(ProblemCategoryChartImpl);
