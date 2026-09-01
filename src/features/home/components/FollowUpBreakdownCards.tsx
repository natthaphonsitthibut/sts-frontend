import { ChartEmptyState, PanelSection } from "./ChartCard";
import { LabelCountBars } from "./LabelCountBars";
import type {
  HomeDashboardLabelCount,
  HomeDashboardReferralFunnel,
} from "../types/home-dashboard.types";

const CONCERN_BAR_CLASSES: Record<string, string> = {
  CONCERN: "bg-tier-high",
  WATCH: "bg-tier-watch",
  NOTE: "bg-chart-7",
};

/** สาเหตุการขาดเรียนที่ผลการติดตามยืนยัน แยกเป็นหมวดใหญ่ */
export function AbsenceReasonSection({
  categories,
}: {
  categories: HomeDashboardLabelCount[];
}) {
  const total = categories.reduce((sum, item) => sum + item.count, 0);

  return (
    <PanelSection
      description={
        total > 0
          ? `จากผลการติดตามล่าสุดของนักเรียน ${total.toLocaleString("th-TH")} คน`
          : "ยังไม่มีผลการติดตามที่ระบุสาเหตุการขาดเรียนในขอบเขตนี้"
      }
      title="สาเหตุการขาดเรียน"
    >
      <div data-absence-reasons="true">
        {categories.length === 0 ? (
          <ChartEmptyState message="ไม่มีข้อมูลสาเหตุการขาดเรียนในขอบเขตปัจจุบัน" />
        ) : (
          <LabelCountBars barClassName="bg-chart-2" items={categories} />
        )}
      </div>
    </PanelSection>
  );
}

/** ระดับความห่วงใยจากครูประจำชั้น — สัญญาณที่มาก่อนการเปิดเคส */
export function ConcernLevelSection({
  levels,
}: {
  levels: HomeDashboardLabelCount[];
}) {
  const concerning = levels
    .filter((level) => level.key !== "NOTE")
    .reduce((sum, level) => sum + level.count, 0);

  return (
    <PanelSection
      description={
        levels.length > 0
          ? `ครูบันทึกว่าควรเฝ้าดูหรือน่ากังวลรวม ${concerning.toLocaleString("th-TH")} คน`
          : "ยังไม่มีข้อสังเกตจากครูประจำชั้นในขอบเขตนี้"
      }
      title="ระดับความห่วงใยจากครูประจำชั้น"
    >
      <div data-concern-levels="true">
        {levels.length === 0 ? (
          <ChartEmptyState message="ไม่มีข้อสังเกตจากครูประจำชั้นในขอบเขตปัจจุบัน" />
        ) : (
          <LabelCountBars
            barClassName={(item) =>
              CONCERN_BAR_CLASSES[item.key] ?? "bg-slate-400"
            }
            items={levels}
          />
        )}
      </div>
    </PanelSection>
  );
}

/** เหตุที่ตามไม่ถึงตัวเด็ก — ติดต่อไม่ได้กับปฏิเสธการติดตามแก้คนละวิธี */
export function UnreachableReasonsSection({
  reasons,
}: {
  reasons: HomeDashboardLabelCount[];
}) {
  const total = reasons.reduce((sum, reason) => sum + reason.count, 0);

  return (
    <PanelSection
      description={
        total > 0
          ? `นักเรียน ${total.toLocaleString("th-TH")} คนที่ออกติดตามแล้วแต่ยังไม่สำเร็จ`
          : "ยังไม่มีการติดตามที่บันทึกว่าไม่สำเร็จในขอบเขตนี้"
      }
      title="เหตุที่ติดตามไม่สำเร็จ"
    >
      <div data-unreachable-reasons="true">
        {reasons.length === 0 ? (
          <ChartEmptyState message="ไม่มีรายการติดตามที่ไม่สำเร็จในขอบเขตปัจจุบัน" />
        ) : (
          <LabelCountBars barClassName="bg-danger" items={reasons} />
        )}
      </div>
    </PanelSection>
  );
}

/** ส่งต่อหน่วยงานไปแล้วเท่าไร และค้างที่ยังไม่ตอบรับเท่าไร */
export function ReferralFunnelSection({
  funnel,
}: {
  funnel: HomeDashboardReferralFunnel;
}) {
  const items = [
    { key: "referred", label: "ส่งต่อแล้ว", value: funnel.referred },
    { key: "accepted", label: "หน่วยงานรับเรื่อง", value: funnel.accepted },
    { key: "pending", label: "ยังไม่ตอบรับ", value: funnel.pending },
  ];

  return (
    <PanelSection
      description="เคสที่ส่งต่อหน่วยงานภายนอก และส่วนที่ยังไม่มีหน่วยงานรับเรื่อง"
      title="การส่งต่อหน่วยงาน"
    >
      <div data-referral-funnel="true">
        <div className="grid gap-3 sm:grid-cols-3">
          {items.map((item) => (
            <div
              className="rounded-lg border border-slate-200 bg-white px-4 py-3"
              data-referral-metric={item.key}
              key={item.key}
            >
              <div className="text-sm text-content-secondary">{item.label}</div>
              <div className="text-2xl font-bold tabular-nums text-slate-950">
                {item.value.toLocaleString("th-TH")} เคส
              </div>
            </div>
          ))}
        </div>

        {funnel.byAgency.length > 0 ? (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <h4 className="text-sm font-semibold text-slate-700">
              ส่งไปหน่วยงานไหนบ้าง
            </h4>
            <ul className="mt-2 space-y-1.5" data-referral-agencies>
              {funnel.byAgency.map((agency) => (
                <li
                  className="flex items-baseline justify-between gap-3 text-sm"
                  key={agency.key}
                >
                  <span className="truncate text-slate-600">
                    {agency.label}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-slate-900">
                    {agency.count.toLocaleString("th-TH")} เคส
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </PanelSection>
  );
}
