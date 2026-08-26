import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Button, Card } from "../../../components/base";
import { ContextLink } from "../../../components/layout/context-link";
import {
  ErrorState,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import { formatThaiDateTime } from "../../../lib/date-time";
import { riskDashboardService } from "../api/risk-dashboard.service";
import {
  findStatusCatalogItem,
  useStatusCatalog,
} from "../../status-catalog/hooks/useStatusCatalog";

function OutcomeMetric({
  label,
  value,
}: {
  label: string;
  value: {
    succeeded: number;
    notSucceeded: number;
    total: number;
    successRate: number | null;
  };
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-600">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">
        {value.successRate === null ? "-" : `${value.successRate}%`}
      </p>
      <p className="mt-2 text-sm text-slate-600">
        สำเร็จ {value.succeeded} · ยังไม่สำเร็จ {value.notSucceeded} · รวม{" "}
        {value.total}
      </p>
    </article>
  );
}

export function FollowUpSummaryPanel({
  aggregateOnly = false,
}: {
  aggregateOnly?: boolean;
}) {
  const [showDrilldown, setShowDrilldown] = useState(false);
  const referralStatuses = useStatusCatalog("CASE_REFERRAL");
  const referralStatusLabel = (code: string): string =>
    findStatusCatalogItem(referralStatuses.items, code)?.label ?? code;
  const summaryQuery = useQuery({
    queryKey: ["follow-up-summary"],
    queryFn: riskDashboardService.getFollowUpSummary,
  });
  const drilldownQuery = useQuery({
    queryKey: ["referral-drilldown"],
    queryFn: () => riskDashboardService.getReferralDrilldown(1, 20),
    enabled: showDrilldown && !aggregateOnly,
  });

  if (summaryQuery.isLoading) {
    return (
      <Card className="p-5">
        <SkeletonStack lines={4} />
      </Card>
    );
  }
  if (summaryQuery.isError || !summaryQuery.data) {
    return (
      <ErrorState
        description="กรุณาลองโหลดข้อมูลภาพรวมอีกครั้ง"
        onRetry={() => void summaryQuery.refetch()}
        title="โหลดภาพรวมการติดตามไม่สำเร็จ"
      />
    );
  }
  const summary = summaryQuery.data;

  return (
    <Card className="p-5" data-follow-up-summary>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="size-5 text-primary" aria-hidden="true" />
            <h2 className="text-lg font-bold text-slate-900">
              ผลการติดตามและการส่งต่อ
            </h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            นับเฉพาะรายงานที่ส่งแล้วภายในขอบเขตข้อมูลของบัญชีนี้
          </p>
        </div>
        {aggregateOnly ? (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            แสดงเฉพาะข้อมูลรวม
          </span>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <OutcomeMetric
          label="งานติดตาม (VISIT)"
          value={summary.outcomes.visit}
        />
        <OutcomeMetric
          label="งานช่วยเหลือ (ASSIST)"
          value={summary.outcomes.assist}
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 p-3">
          <p className="text-xs font-semibold text-slate-500">ส่งต่อทั้งหมด</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {summary.referrals.total}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 p-3">
          <p className="text-xs font-semibold text-slate-500">
            ค้างเกิน 14 วัน
          </p>
          <p className="mt-1 text-2xl font-bold text-warning-700">
            {summary.referrals.overdue}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 p-3">
          <p className="text-xs font-semibold text-slate-500">
            ไม่สำเร็จซ้ำ ≥ 2 รอบ
          </p>
          <p className="mt-1 text-2xl font-bold text-danger-700">
            {summary.repeatedUnsuccessfulCaseCount}
          </p>
        </div>
      </div>

      {Object.keys(summary.referrals.byStatus).length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2" aria-label="สถานะการส่งต่อ">
          {Object.entries(summary.referrals.byStatus).map(([status, count]) => (
            <span
              className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
              key={status}
            >
              {referralStatusLabel(status)} {count}
            </span>
          ))}
        </div>
      ) : null}

      {summary.assistanceMeasures.length > 0 ||
      summary.referrals.byAgency.length > 0 ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {summary.assistanceMeasures.length > 0 ? (
            <section
              className="rounded-xl border border-slate-200 p-4"
              aria-labelledby="assistance-measures-title"
            >
              <h3
                className="font-semibold text-slate-900"
                id="assistance-measures-title"
              >
                ผลตามมาตรการช่วยเหลือ
              </h3>
              <div className="mt-3 space-y-2">
                {summary.assistanceMeasures.map((measure) => (
                  <div
                    className="flex items-start justify-between gap-3 text-sm"
                    key={measure.code}
                  >
                    <span className="text-slate-700">{measure.label}</span>
                    <span className="shrink-0 font-semibold text-slate-900">
                      สำเร็จ {measure.succeeded}/{measure.total}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {summary.referrals.byAgency.length > 0 ? (
            <section
              className="rounded-xl border border-slate-200 p-4"
              aria-labelledby="referral-agencies-title"
            >
              <h3
                className="font-semibold text-slate-900"
                id="referral-agencies-title"
              >
                หน่วยงานรับส่งต่อ
              </h3>
              <div className="mt-3 space-y-2">
                {summary.referrals.byAgency.map((agency) => (
                  <div
                    className="flex items-start justify-between gap-3 text-sm"
                    key={agency.agencyName}
                  >
                    <span className="text-slate-700">{agency.agencyName}</span>
                    <span className="shrink-0 font-semibold text-slate-900">
                      {agency.count} รายการ
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {!aggregateOnly ? (
        <div className="mt-4 border-t border-slate-200 pt-4">
          <Button
            icon={showDrilldown ? ChevronUp : ChevronDown}
            onClick={() => setShowDrilldown((value) => !value)}
            type="button"
            variant="outline"
          >
            {showDrilldown ? "ซ่อนรายการส่งต่อ" : "ดูรายการส่งต่อ"}
          </Button>
          {showDrilldown ? (
            <div className="mt-3 space-y-2">
              {drilldownQuery.isLoading ? <SkeletonStack lines={3} /> : null}
              {drilldownQuery.isError ? (
                <p className="text-sm font-medium text-danger-700" role="alert">
                  ไม่สามารถเปิดรายชื่อได้ กรุณาตรวจสอบสิทธิ์หรือโหลดใหม่
                </p>
              ) : null}
              {(drilldownQuery.data?.items ?? []).map((referral) => (
                <article
                  className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between"
                  key={referral.id}
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {referral.studentName}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {referral.agencyName} ·{" "}
                      {referralStatusLabel(referral.statusCode)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {referral.schoolName || "ไม่ระบุโรงเรียน"} ·{" "}
                      {formatThaiDateTime(referral.referredAt)}
                    </p>
                  </div>
                  <ContextLink
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/5"
                    to={`/cases/${referral.caseId}`}
                  >
                    ดูรายละเอียดการส่งต่อ{" "}
                    <ExternalLink className="size-4" aria-hidden="true" />
                  </ContextLink>
                </article>
              ))}
              {!drilldownQuery.isLoading &&
              (drilldownQuery.data?.items.length ?? 0) === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
                  ยังไม่มีรายการส่งต่อในขอบเขตนี้
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
