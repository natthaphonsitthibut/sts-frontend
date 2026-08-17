import { PieChartIcon } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card } from "../../../components/base";

interface CauseCategoryChartProps {
  distribution: { key: string; label: string; count: number }[];
}

const COLORS = [
  "var(--color-primary)",
  "var(--color-primary-light)",
  "var(--color-amber-500)",
  "var(--color-red-500)",
  "var(--color-violet-500)",
  "var(--color-pink-500)",
  "var(--color-cyan-500)",
  "var(--color-orange-500)",
];

export function CauseCategoryChart({ distribution }: CauseCategoryChartProps) {
  const total = distribution.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
          <PieChartIcon className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            สัดส่วนสาเหตุความเสี่ยง
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {total > 0
              ? `อ้างอิงจากข้อมูลการลงพื้นที่ทั้งหมด ${total.toLocaleString(
                  "th-TH",
                )} รายการ ในขอบเขตปัจจุบัน`
              : "ไม่มีข้อมูลในขอบเขตปัจจุบัน"}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <div className="h-[200px] w-full sm:w-[200px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={distribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="count"
              >
                {distribution.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [
                  `${Number(value ?? 0).toLocaleString("th-TH")} รายการ`,
                  "จำนวน",
                ]}
                contentStyle={{
                  borderRadius: "8px",
                  border: "none",
                  boxShadow:
                    "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
                  fontSize: "14px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-3 w-full">
          {distribution.map((item, index) => {
            const percentage = Math.round((item.count / total) * 100) || 0; // Prevent NaN if total is 0
            return (
              <div
                key={item.key}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{
                      backgroundColor: COLORS[index % COLORS.length],
                    }}
                  />
                  <span className="truncate text-slate-700 font-medium">
                    {item.label}
                  </span>
                </div>
                <div className="flex items-baseline gap-2 shrink-0">
                  <span className="font-semibold text-slate-900 tabular-nums">
                    {item.count.toLocaleString("th-TH")}
                  </span>
                  <span className="text-xs text-slate-500 tabular-nums w-8 text-right">
                    {percentage}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
