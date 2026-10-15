import { BriefcaseBusiness } from "lucide-react";
import { Link } from "react-router-dom";
import { ChartCard } from "./ChartCard";
import { usePermissions } from "../../auth/hooks/usePermissions";
import type {
  HomeDashboardCasePipeline,
  HomeDashboardFilters,
} from "../types/home-dashboard.types";

interface CasePipelineChartProps {
  filters: HomeDashboardFilters;
  pipeline: HomeDashboardCasePipeline;
}

const PIPELINE_ITEMS: Array<{
  key: keyof Pick<
    HomeDashboardCasePipeline,
    "OPEN" | "IN_PROGRESS" | "PENDING_REVIEW"
  >;
  label: string;
  barClassName: string;
}> = [
  { key: "OPEN", label: "เปิดเคส", barClassName: "bg-primary" },
  { key: "IN_PROGRESS", label: "รอติดตาม", barClassName: "bg-warning" },
  {
    key: "PENDING_REVIEW",
    label: "รอพิจารณา",
    barClassName: "bg-primary-dark",
  },
];

function buildCasePath(filters: HomeDashboardFilters, status: string): string {
  const params = new URLSearchParams({ caseStatus: status });
  if (filters.province) params.set("province", filters.province);
  if (filters.district) params.set("district", filters.district);
  if (filters.subDistrict) params.set("subDistrict", filters.subDistrict);
  if (filters.schoolId) params.set("schoolId", String(filters.schoolId));
  if (filters.grade) params.set("grade", filters.grade);
  if (filters.room) params.set("room", filters.room);
  return `/student-risk-report/risk?${params.toString()}`;
}

export function CasePipelineChart({
  filters,
  pipeline,
}: CasePipelineChartProps) {
  // The overview is every account's to read; the jump into the case list is
  // รายงานสถานะนักเรียน's, so without it a row stays plain text instead of a
  // link onto a page that refuses the account.
  const { can } = usePermissions();
  const openable = can("dashboard");
  const maxCount = Math.max(
    ...PIPELINE_ITEMS.map((item) => pipeline[item.key]),
    1,
  );
  const activeTotal = PIPELINE_ITEMS.reduce(
    (sum, item) => sum + pipeline[item.key],
    0,
  );

  return (
    <ChartCard
      description={`${activeTotal.toLocaleString("th-TH")} เคสในขอบเขตปัจจุบัน ไม่รวมเคสปิดแล้ว`}
      icon={BriefcaseBusiness}
      testAttribute={{ "data-case-pipeline": "true" }}
      title="เคสที่กำลังดำเนินการ"
      tone="warning"
    >
      <div className="space-y-3">
        {PIPELINE_ITEMS.map((item) => {
          const count = pipeline[item.key];
          const rowContent = (
            <>
              <span className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-semibold text-slate-700">
                  {item.label}
                </span>
                <span className="text-sm font-bold tabular-nums text-slate-900">
                  {count.toLocaleString("th-TH")} เคส
                </span>
              </span>
              <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-slate-100">
                <span
                  className={`block h-full rounded-full ${item.barClassName}`}
                  style={{
                    width: `${count === 0 ? 0 : Math.max((count / maxCount) * 100, 3)}%`,
                  }}
                />
              </span>
            </>
          );
          return openable ? (
            <Link
              className="block rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              data-case-pipeline-status={item.key}
              key={item.key}
              to={buildCasePath(filters, item.key)}
            >
              {rowContent}
            </Link>
          ) : (
            <div
              className="block rounded-lg px-2 py-1.5"
              data-case-pipeline-status={item.key}
              data-case-pipeline-locked="true"
              key={item.key}
            >
              {rowContent}
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}
