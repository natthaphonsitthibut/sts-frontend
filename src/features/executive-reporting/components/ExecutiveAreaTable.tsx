import { Badge, Card } from "../../../components/base";
import { formatThaiDateTime } from "../../../lib/date-time";
import {
  getAreaLabel,
  getFreshnessState,
  getLatestFreshnessTimestamp,
} from "../lib/executive-reporting-presentation";
import type { ExecutiveReportingArea } from "../types/executive-reporting.types";
import { CountValue } from "./ExecutiveReportingSummary";

function FreshnessCell({ area }: { area: ExecutiveReportingArea }) {
  const state = getFreshnessState(area.freshness);
  const latest = getLatestFreshnessTimestamp(area.freshness);
  return (
    <div className="flex flex-col items-start gap-1">
      <Badge variant={state === "CURRENT" ? "success" : "warning"}>
        {state === "CURRENT" ? "มีเวลาข้อมูลครบ" : "อาจล้าสมัย"}
      </Badge>
      <span className="text-xs text-slate-500">
        {latest ? formatThaiDateTime(latest) : "ไม่พบเวลาปรับปรุง"}
      </span>
    </div>
  );
}

function MobileArea({ area }: { area: ExecutiveReportingArea }) {
  return (
    <article className="border-b border-slate-200 p-4 last:border-b-0">
      <h3 className="font-semibold text-slate-900">{getAreaLabel(area)}</h3>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        {[
          ["นักเรียน", area.activeStudents],
          ["เสี่ยงสูง", area.risk.high],
          ["ครูกังวล", area.risk.humanConcernStudentsInPeriod],
          ["ยังไม่ยุติ", area.cases.unresolved],
          ["ส่งต่อระดับบน", area.cases.reportedUp],
        ].map(([label, count]) => (
          <div key={String(label)}>
            <dt className="text-slate-500">{String(label)}</dt>
            <dd className="mt-0.5 font-semibold text-slate-900">
              <CountValue
                count={count as ExecutiveReportingArea["activeStudents"]}
              />
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 border-t border-slate-100 pt-3">
        <FreshnessCell area={area} />
      </div>
    </article>
  );
}

export function ExecutiveAreaTable({
  areas,
}: {
  areas: ExecutiveReportingArea[];
}) {
  return (
    <Card>
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-slate-900">
          เปรียบเทียบรายพื้นที่
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          แสดงเฉพาะตัวเลขรวม ไม่มีรายชื่อนักเรียนหรือบันทึกข้อความรายบุคคล
        </p>
      </div>

      <div className="md:hidden">
        {areas.map((area) => (
          <MobileArea
            area={area}
            key={`${area.level}-${getAreaLabel(area)}-${area.schoolId ?? "area"}`}
          />
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
          <caption className="sr-only">
            ตารางเปรียบเทียบข้อมูลรวมแต่ละพื้นที่
          </caption>
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-4 py-3" scope="col">
                พื้นที่
              </th>
              <th className="px-4 py-3 text-right" scope="col">
                นักเรียน
              </th>
              <th className="px-4 py-3 text-right" scope="col">
                เสี่ยงสูง
              </th>
              <th className="px-4 py-3 text-right" scope="col">
                ครูกังวล
              </th>
              <th className="px-4 py-3 text-right" scope="col">
                ยังไม่ยุติ
              </th>
              <th className="px-4 py-3 text-right" scope="col">
                ส่งต่อระดับบน
              </th>
              <th className="px-4 py-3" scope="col">
                ความสดใหม่
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {areas.map((area) => (
              <tr
                key={`${area.level}-${getAreaLabel(area)}-${area.schoolId ?? "area"}`}
              >
                <th
                  className="max-w-64 px-4 py-4 font-semibold text-slate-900"
                  scope="row"
                >
                  {getAreaLabel(area)}
                </th>
                {[
                  area.activeStudents,
                  area.risk.high,
                  area.risk.humanConcernStudentsInPeriod,
                  area.cases.unresolved,
                  area.cases.reportedUp,
                ].map((count, index) => (
                  <td
                    className="px-4 py-4 text-right font-medium text-slate-800"
                    key={index}
                  >
                    <CountValue count={count} />
                  </td>
                ))}
                <td className="px-4 py-4">
                  <FreshnessCell area={area} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
