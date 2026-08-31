import { cn } from "../../../lib/utils";
import { ChartEmptyState, PanelSection } from "./ChartCard";
import type { HomeDashboardProblemOutcomeRow } from "../types/home-dashboard.types";

interface ProblemOutcomeChartProps {
  rows: HomeDashboardProblemOutcomeRow[];
}

const OUTCOME_TONE: Record<string, string> = {
  RETURNED_TO_SCHOOL: "bg-success",
  TRANSFERRED_SCHOOL: "bg-chart-7",
  ILLNESS: "bg-chart-5",
  WORKING: "bg-warning",
  UNREACHABLE: "bg-danger",
  OTHER: "bg-slate-400",
};

function outcomeTone(key: string): string {
  return OUTCOME_TONE[key] ?? "bg-slate-400";
}

/**
 * ปัญหาประเภทไหนจบลงอย่างไร. Two categories with the same case count can be worlds
 * apart — one closing as กลับมาเรียนแล้ว and the other as ติดต่อไม่ได้ — and that
 * difference, not the count, is what decides where a measure needs changing.
 */
export function ProblemOutcomeChart({ rows }: ProblemOutcomeChartProps) {
  const legend = new Map<string, string>();
  rows.forEach((row) =>
    row.outcomes.forEach((outcome) => legend.set(outcome.key, outcome.label)),
  );

  return (
    <PanelSection
      description="แถวคือประเภทปัญหา สีในแถบคือผลที่ผู้รีวิวเลือกตอนปิดเคส"
      title="ผลปลายทางของแต่ละประเภทปัญหา"
    >
      <div data-problem-outcome="true">
        {rows.length === 0 ? (
          <ChartEmptyState message="ยังไม่มีเคสที่ปิดพร้อมระบุผลในขอบเขตนี้" />
        ) : (
          <>
            <ul className="space-y-4">
              {rows.map((row) => (
                <li key={row.key}>
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm font-semibold text-slate-700">
                      {row.label}
                    </span>
                    <span className="shrink-0 text-sm font-bold tabular-nums text-slate-900">
                      {row.total.toLocaleString("th-TH")} เคส
                    </span>
                  </span>
                  <span className="mt-1.5 flex h-3 overflow-hidden rounded-full bg-slate-100">
                    {row.outcomes.map((outcome) => (
                      <span
                        className={cn("block h-full", outcomeTone(outcome.key))}
                        key={outcome.key}
                        style={{
                          width: `${(outcome.count / Math.max(row.total, 1)) * 100}%`,
                        }}
                        title={`${outcome.key === "OTHER" ? "ปิดด้วยเหตุอื่น" : outcome.label} ${outcome.count.toLocaleString("th-TH")} เคส`}
                      />
                    ))}
                  </span>
                  <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                    {row.outcomes.map((outcome) => (
                      <span className="tabular-nums" key={outcome.key}>
                        {outcome.key === "OTHER"
                          ? "ปิดด้วยเหตุอื่น"
                          : outcome.label}{" "}
                        <b className="text-slate-800">
                          {outcome.count.toLocaleString("th-TH")}
                        </b>
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="text-xs text-slate-500">
                ผลปิดเคสมาจากตัวเลือกที่ผู้รีวิวเลือกตอนปิดเคส
                ไม่ได้คำนวณจากการเช็กชื่อ
              </p>
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600">
                {Array.from(legend.entries()).map(([key, label]) => (
                  <li className="flex items-center gap-1.5" key={key}>
                    <span
                      className={cn("size-2.5 rounded-full", outcomeTone(key))}
                    />
                    {key === "OTHER" ? "ปิดด้วยเหตุอื่น" : label}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </PanelSection>
  );
}
