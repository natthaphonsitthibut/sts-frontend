import { SummaryMetrics } from "../../../components/layout/page-primitives";
import type { OverviewStatsData } from "../types/stats.types";

interface OverviewSummaryCardsProps {
  overviewData: OverviewStatsData;
  className?: string;
}

export function OverviewSummaryCards({
  overviewData,
  className,
}: OverviewSummaryCardsProps) {
  return (
    <SummaryMetrics
      className={className}
      columns={3}
      items={[
        {
          label: "เด็กทั้งหมด",
          value: overviewData.totalStudents.toLocaleString(),
          tone: "info",
        },
        {
          label: "เด็กเสี่ยง",
          value: overviewData.atRiskStudents.toLocaleString(),
          tone: "warning",
        },
        {
          label: "เด็กหลุด",
          value: overviewData.dropoutStudents.toLocaleString(),
          tone: "danger",
        },
      ]}
    />
  );
}
