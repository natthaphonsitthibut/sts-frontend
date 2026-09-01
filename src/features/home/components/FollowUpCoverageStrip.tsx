import { Link } from "react-router-dom";
import { cn } from "../../../lib/utils";
import type { HomeDashboardFollowUpCoverage } from "../types/home-dashboard.types";

interface FollowUpCoverageStripProps {
  coverage: HomeDashboardFollowUpCoverage;
  /** null when the account may not open the risk report; the figure stays text. */
  unclassifiedPath: string | null;
}

/**
 * The caveat every chart in this panel depends on, so it sits above the tabs
 * rather than inside one: a child nobody has reached yet has no recorded cause
 * and appears in none of the breakdowns below.
 */
export function FollowUpCoverageStrip({
  coverage,
  unclassifiedPath,
}: FollowUpCoverageStripProps) {
  const {
    atRiskStudents,
    followedUpStudents,
    pendingStudents,
    recordedStudents,
  } = coverage;
  const followedUpPercent =
    atRiskStudents > 0
      ? Math.round((followedUpStudents / atRiskStudents) * 100)
      : 0;

  const figure = (value: number, className?: string) => (
    <span className={cn("text-xl font-bold tabular-nums", className)}>
      {value.toLocaleString("th-TH")}
    </span>
  );

  return (
    <div data-follow-up-coverage>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <span className="flex items-baseline gap-1.5 text-sm text-content-secondary">
          นักเรียนกลุ่มเสี่ยงตอนนี้ {figure(atRiskStudents, "text-slate-950")}{" "}
          คน
        </span>
        <span className="flex items-baseline gap-1.5 text-sm text-content-secondary">
          ตามไปแล้ว {figure(followedUpStudents, "text-success-700")} คน
        </span>
        {unclassifiedPath ? (
          <Link
            className="flex items-baseline gap-1.5 rounded-md text-sm text-content-secondary underline-offset-4 transition-colors hover:text-danger-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            data-follow-up-unclassified
            to={unclassifiedPath}
          >
            ยังไม่ได้ตาม {figure(pendingStudents, "text-danger-700")} คน
          </Link>
        ) : (
          <span
            className="flex items-baseline gap-1.5 text-sm text-content-secondary"
            data-follow-up-unclassified
            title="บัญชีนี้ไม่มีสิทธิ์เปิดหน้ารายงานปลายทาง"
          >
            ยังไม่ได้ตาม {figure(pendingStudents, "text-danger-700")} คน
          </span>
        )}
        <span
          aria-label={`ตามไปแล้ว ${followedUpPercent} เปอร์เซ็นต์ของนักเรียนที่เสี่ยงอยู่ตอนนี้`}
          className="h-1.5 min-w-24 flex-1 overflow-hidden rounded-full bg-danger-100"
          role="img"
        >
          <span
            className="block h-full rounded-full bg-success"
            style={{ width: `${followedUpPercent}%` }}
          />
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {`ตัวเลขเดียวกับการ์ด “นักเรียนกลุ่มเสี่ยง” ด้านบน — นับเฉพาะคนที่ยังอยู่ในกลุ่มเสี่ยงตอนนี้ เด็กที่ปิดเคสแล้วและกลับมาปกติจะไม่อยู่ในตัวเลขนี้ · กราฟด้านล่างอ้างอิงผลการติดตามของนักเรียน ${recordedStudents.toLocaleString("th-TH")} คน รวมที่ปิดเคสไปแล้ว`}
      </p>
    </div>
  );
}
