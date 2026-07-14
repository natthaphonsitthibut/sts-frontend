import { Clock3 } from "lucide-react";
import { Badge, Card } from "../../../components/base";
import { formatThaiDateTime } from "../../../lib/date-time";
import {
  getFreshnessState,
  getLatestFreshnessTimestamp,
} from "../lib/executive-reporting-presentation";
import type {
  ExecutiveReportingSummary as ExecutiveReportingSummaryData,
  SuppressedCount,
} from "../types/executive-reporting.types";

export function CountValue({ count }: { count: SuppressedCount }) {
  if (count.suppressed || count.value === null) {
    return (
      <span className="text-xs font-medium leading-5 text-warning-700">
        ข้อมูลไม่เพียงพอ
      </span>
    );
  }
  return (
    <span className="tabular-nums">{count.value.toLocaleString("th-TH")}</span>
  );
}

const freshnessCopy = {
  CURRENT: { label: "มีเวลาข้อมูลครบ", variant: "success" as const },
  PARTIAL: { label: "ข้อมูลบางส่วนอาจล้าสมัย", variant: "warning" as const },
  MISSING: { label: "ข้อมูลอาจล้าสมัย", variant: "warning" as const },
};

function Metric({ label, value }: { label: string; value: SuppressedCount }) {
  return (
    <div className="min-w-0 border-b border-slate-100 px-4 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <dt className="text-sm text-slate-600">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold text-slate-900">
        <CountValue count={value} />
      </dd>
    </div>
  );
}

function MetricList({
  items,
  title,
}: {
  items: Array<{ label: string; value: SuppressedCount }>;
  title: string;
}) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <div
            className="flex items-baseline justify-between gap-3 border-b border-slate-100 pb-2"
            key={item.label}
          >
            <dt className="text-sm text-slate-600">{item.label}</dt>
            <dd className="shrink-0 font-semibold text-slate-900">
              <CountValue count={item.value} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function ExecutiveReportingSummary({
  minimumCellSize,
  summary,
}: {
  minimumCellSize: number;
  summary: ExecutiveReportingSummaryData;
}) {
  const freshnessState = getFreshnessState(summary.freshness);
  const freshness = freshnessCopy[freshnessState];
  const latestTimestamp = getLatestFreshnessTimestamp(summary.freshness);

  return (
    <Card>
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            ภาพรวมในขอบเขตที่เลือก
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            ค่าที่มากกว่า 0 แต่น้อยกว่า{" "}
            {minimumCellSize.toLocaleString("th-TH")} คนจะถูกปกปิด
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <Badge variant={freshness.variant}>{freshness.label}</Badge>
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="size-4" aria-hidden="true" />
            {latestTimestamp
              ? `ล่าสุด ${formatThaiDateTime(latestTimestamp)}`
              : "ไม่พบเวลาปรับปรุง"}
          </span>
        </div>
      </div>

      <dl className="grid sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="นักเรียนที่กำลังเรียน" value={summary.activeStudents} />
        <Metric label="เคสยังไม่ยุติ" value={summary.cases.unresolved} />
        <Metric label="ส่งต่อระดับบน" value={summary.cases.reportedUp} />
        <Metric label="ยุติในช่วงเวลา" value={summary.cases.resolvedInPeriod} />
      </dl>

      <div className="space-y-6 border-t border-slate-200 p-5">
        <MetricList
          title="ระดับความเสี่ยง"
          items={[
            { label: "สูง", value: summary.risk.high },
            { label: "กลาง", value: summary.risk.medium },
            { label: "ต่ำ", value: summary.risk.low },
            { label: "เฝ้าระวัง", value: summary.risk.watch },
            { label: "ปกติ", value: summary.risk.normal },
            { label: "ยังไม่มีโปรไฟล์", value: summary.risk.missingProfile },
            {
              label: "ครูกังวลในช่วงเวลา",
              value: summary.risk.humanConcernStudentsInPeriod,
            },
          ]}
        />
        <MetricList
          title="สถานะเคส"
          items={[
            {
              label: "เปิดใหม่ในช่วงเวลา",
              value: summary.cases.createdInPeriod,
            },
            { label: "ยังไม่ยุติ", value: summary.cases.unresolved },
            { label: "ยุติในช่วงเวลา", value: summary.cases.resolvedInPeriod },
            { label: "ส่งต่อระดับบน", value: summary.cases.reportedUp },
          ]}
        />
      </div>
    </Card>
  );
}
