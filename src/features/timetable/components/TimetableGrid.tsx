import type { ReactNode } from "react";
import { CalendarClock } from "lucide-react";
import { EmptyState } from "../../../components/layout/page-primitives";
import { cn } from "../../../lib/utils";
import { DAY_LABELS, getPeriodTimeLabel } from "../lib/period-times";
import type { SchoolPeriodTime, TimetableSlot } from "../types/timetable.types";

const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 7];

function getGridDays(slots: TimetableSlot[]): number[] {
  const days = new Set<number>();
  for (const slot of slots) days.add(slot.day_of_week);
  return WEEK_DAYS.filter((day) => days.has(day));
}

function getGridPeriods(slots: TimetableSlot[]): number[] {
  const periods = new Set<number>();
  for (const slot of slots) periods.add(slot.period);
  return Array.from(periods).sort((a, b) => a - b);
}

/**
 * The grid header shows one time label per period column, shared across every
 * day row. Period times can differ by day (e.g. a longer Monday flag-ceremony
 * period), so this picks Monday as the representative day when available,
 * falling back to whichever day the school's schedule actually has — a
 * deliberate simplification of the header display, not a data limitation
 * (each cell's own day still resolves its own real time if shown elsewhere).
 */
function getRepresentativeDay(days: number[], periodTimes: SchoolPeriodTime[]): number {
  return days.find((day) => periodTimes.some((row) => row.day_of_week === day)) ?? days[0] ?? 1;
}

interface TimetableGridProps {
  slots: TimetableSlot[];
  periodTimes: SchoolPeriodTime[];
  /** Render a cell's content for one slot; omit for the default subject+teacher label. */
  renderSlot?: (slot: TimetableSlot) => ReactNode;
  emptyDescription?: string;
  /** When true, strips the outer card wrapper (border, rounded, shadow) — use when the grid is already inside a card container. */
  borderless?: boolean;
}

export function TimetableGrid({
  borderless = false,
  emptyDescription,
  periodTimes,
  renderSlot,
  slots,
}: TimetableGridProps) {
  if (slots.length === 0) {
    return (
      <EmptyState
        description={emptyDescription ?? "ยังไม่มีการจัดคาบสอนสำหรับตารางนี้"}
        icon={CalendarClock}
        title="ไม่มีตารางสอน"
      />
    );
  }

  const days = getGridDays(slots);
  const periods = getGridPeriods(slots);
  const representativeDay = getRepresentativeDay(days, periodTimes);
  const slotsByDayAndPeriod = new Map<string, TimetableSlot[]>();
  for (const slot of slots) {
    const key = `${slot.day_of_week}-${slot.period}`;
    const list = slotsByDayAndPeriod.get(key) ?? [];
    list.push(slot);
    slotsByDayAndPeriod.set(key, list);
  }

  return (
    <div
      className={cn(
        "overflow-hidden bg-white",
        !borderless && "rounded-lg border border-slate-200 shadow-sm",
      )}
    >
      <div className="overflow-x-auto">
        <table
          className="w-full border-collapse text-left text-xs sm:text-sm"
          style={{ tableLayout: "fixed", minWidth: `${periods.length * 140 + 80}px` }}
        >
          <colgroup>
            <col style={{ width: "80px" }} />
            {periods.map((period) => (
              <col key={period} />
            ))}
          </colgroup>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="bg-slate-50 px-3 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                วัน
              </th>
              {periods.map((period) => (
                <th
                  className="px-2 py-3 align-top text-xs font-bold text-slate-600"
                  key={period}
                >
                  <div>คาบ {period}</div>
                  <div className="mt-0.5 font-normal text-slate-400">
                    {getPeriodTimeLabel(periodTimes, representativeDay, period)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr className="border-b border-slate-100 last:border-b-0" key={day}>
                <td className="whitespace-nowrap bg-white px-3 align-middle text-sm font-bold text-slate-800">
                  {DAY_LABELS[day]}
                </td>
                {periods.map((period) => {
                  const cellSlots = slotsByDayAndPeriod.get(`${day}-${period}`) ?? [];
                  return (
                    <td className="border-l border-slate-100 p-0" key={period}>
                      <div className="px-2 py-2" style={{ height: "88px", maxHeight: "88px", overflow: "hidden" }}>
                        {cellSlots.length === 0 ? (
                          <div className="flex h-full items-center justify-center text-slate-300">
                            —
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {cellSlots.map((slot) =>
                              renderSlot ? (
                                <div key={slot.id}>{renderSlot(slot)}</div>
                              ) : (
                                <div
                                  className={cn(
                                    "overflow-hidden rounded-lg border border-slate-200 bg-white px-2.5 py-2",
                                    "border-l-4 border-l-primary/60 shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
                                  )}
                                  key={slot.id}
                                  style={{ height: "72px", maxHeight: "72px", overflow: "hidden" }}
                                >
                                  <div className="line-clamp-2 break-words text-sm font-bold leading-5 text-slate-900">
                                    {slot.subject_name_th}
                                  </div>
                                  <div className="mt-0.5 line-clamp-1 break-words text-xs leading-4 text-slate-500">
                                    {slot.teacher_name || "ไม่ระบุครูผู้สอน"}
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

