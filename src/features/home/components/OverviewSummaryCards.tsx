import { Footprints, Meh, Users } from "lucide-react";
import { cn } from "../../../lib/utils";
import type { OverviewStatsData } from "../types/stats.types";
import { OverviewMetricCard } from "./OverviewMetricCard";

interface OverviewSummaryCardsProps {
  overviewData: OverviewStatsData;
  className?: string;
}

export function OverviewSummaryCards({
  overviewData,
  className,
}: OverviewSummaryCardsProps) {
  return (
    <div className={cn("grid grid-cols-1 gap-6 lg:grid-cols-3", className)}>
      <OverviewMetricCard
        label="เด็กทั้งหมด"
        value={overviewData.totalStudents}
        subtitle="นักเรียนในระบบ"
        icon={Users}
        tone="emerald"
        size="hero"
      />
      <OverviewMetricCard
        label="เด็กเสี่ยง"
        value={overviewData.atRiskStudents}
        subtitle="ต้องติดตามเพิ่มเติม"
        icon={Meh}
        tone="amber"
        size="hero"
      />
      <OverviewMetricCard
        label="เด็กหลุด"
        value={overviewData.dropoutStudents}
        subtitle="หลุดจากระบบการศึกษา"
        icon={Footprints}
        tone="rose"
        size="hero"
      />
    </div>
  );
}
