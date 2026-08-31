import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Card, Tabs, type TabOption } from "../../../components/base";
import {
  AbsenceReasonSection,
  ConcernLevelSection,
  ReferralFunnelSection,
  UnreachableReasonsSection,
} from "./FollowUpBreakdownCards";
import { FollowUpCoverageStrip } from "./FollowUpCoverageStrip";
import { MonthlySuccessRateChart } from "./MonthlySuccessRateChart";
import { ProblemAreaMatrixSection } from "./ProblemAreaMatrixCard";
import { ProblemCategoryChart } from "./ProblemCategoryChart";
import { ProblemOutcomeChart } from "./ProblemOutcomeChart";
import type {
  HomeDashboardFollowUpInsightsData,
  HomeDashboardMonthlySuccessRate,
} from "../types/home-dashboard.types";

type RiskInsightsTab = "problems" | "followUp" | "outcomes" | "areas";

interface RiskInsightsPanelProps {
  insights: HomeDashboardFollowUpInsightsData;
  monthlySuccessRates: HomeDashboardMonthlySuccessRate[] | null;
  unclassifiedPath: string | null;
}

/**
 * Eight separate cards asked the reader to scroll through eight identical
 * frames to answer one question. They are one panel now: the coverage caveat
 * stays pinned above, and each tab answers a different question about the same
 * population — what the problem is, how the following-up is going, what came of
 * it, and where it clusters.
 */
export function RiskInsightsPanel({
  insights,
  monthlySuccessRates,
  unclassifiedPath,
}: RiskInsightsPanelProps) {
  const [tab, setTab] = useState<RiskInsightsTab>("problems");
  const hasAreaBreakdown = Boolean(insights.problemByArea);

  const options: TabOption[] = [
    { value: "problems", label: "ปัญหาที่พบ" },
    { value: "followUp", label: "การติดตาม" },
    { value: "outcomes", label: "ผลลัพธ์" },
    ...(hasAreaBreakdown
      ? [{ value: "areas", label: "รายพื้นที่" } satisfies TabOption]
      : []),
  ];
  const activeTab: RiskInsightsTab =
    tab === "areas" && !hasAreaBreakdown ? "problems" : tab;

  return (
    <Card className="p-4 sm:p-6" data-risk-insights-panel>
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-danger-100 text-danger-700">
          <ShieldAlert className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-900">
            ภาพรวมความเสี่ยงจากผลการติดตาม
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            ผลการติดตามคือแหล่งเดียวที่บอกได้ว่านักเรียนกลุ่มเสี่ยงเจอปัญหาอะไร
            และมาตรการที่ใช้อยู่ได้ผลกับปัญหาแบบไหน
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <FollowUpCoverageStrip
          coverage={insights.coverage}
          unclassifiedPath={unclassifiedPath}
        />
      </div>

      <Tabs
        aria-label="มุมมองภาพรวมความเสี่ยง"
        className="mt-5 w-full"
        onChange={(value) => setTab(value as RiskInsightsTab)}
        options={options}
        value={activeTab}
      />

      <div className="pt-6">
        {activeTab === "problems" ? (
          <div className="grid gap-x-10 gap-y-8 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <ProblemCategoryChart
              categories={insights.problemCategories}
              otherDetails={insights.otherProblemDetails}
            />
            <AbsenceReasonSection
              categories={insights.absenceReasonCategories}
            />
          </div>
        ) : null}

        {activeTab === "followUp" ? (
          <div className="grid gap-x-10 gap-y-8 lg:grid-cols-2">
            <ConcernLevelSection levels={insights.concernLevels} />
            <UnreachableReasonsSection reasons={insights.unreachableReasons} />
            <ReferralFunnelSection funnel={insights.referralFunnel} />
          </div>
        ) : null}

        {activeTab === "outcomes" ? (
          <div className="grid gap-x-10 gap-y-8 xl:grid-cols-2">
            <ProblemOutcomeChart rows={insights.problemByOutcome} />
            {monthlySuccessRates ? (
              <MonthlySuccessRateChart data={monthlySuccessRates} />
            ) : null}
          </div>
        ) : null}

        {activeTab === "areas" && insights.problemByArea ? (
          <ProblemAreaMatrixSection matrix={insights.problemByArea} />
        ) : null}
      </div>
    </Card>
  );
}
