import type { ReactNode } from "react";
import { CalendarClock, Plus } from "lucide-react";
import { Avatar, HoverTooltip } from "../../../components/base";
import { EmptyState } from "../../../components/layout/page-primitives";
import { resolveApiMediaUrl } from "../../../lib/media-url";
import { cn } from "../../../lib/utils";
import {
  DAY_LABELS,
  getPeriodTimeLabel,
  hoursBetween,
} from "../lib/period-times";
import type { SchoolPeriodTime, TimetableSlot } from "../types/timetable.types";

const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 7];

/**
 * Day rows come from assigned slots alone, unless `includeConfiguredSchedule` is
 * set (the manage view) — then a day the bell schedule already covers shows
 * up too, even before any subject is assigned to it.
 */
function getGridDays(
  slots: TimetableSlot[],
  periodTimes: SchoolPeriodTime[],
  includeConfiguredSchedule: boolean,
): number[] {
  const days = new Set<number>();
  for (const slot of slots) days.add(slot.day_of_week);
  if (includeConfiguredSchedule) {
    for (const row of periodTimes) days.add(row.day_of_week);
  }
  return WEEK_DAYS.filter((day) => days.has(day));
}

/**
 * Period columns come from assigned slots alone, unless `includeConfiguredSchedule`
 * is set — then a period the bell schedule already defines shows up too, even
 * before any subject is assigned to it. Without this, a period added to
 * `school_period_times` (e.g. going from 7 to 8 periods/day) never gets a
 * column to assign a subject into, since one can't exist there yet.
 */
function getGridPeriods(
  slots: TimetableSlot[],
  periodTimes: SchoolPeriodTime[],
  includeConfiguredSchedule: boolean,
): number[] {
  const periods = new Set<number>();
  for (const slot of slots) periods.add(slot.period);
  if (includeConfiguredSchedule) {
    for (const row of periodTimes) periods.add(row.period);
  }
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
function getRepresentativeDay(
  days: number[],
  periodTimes: SchoolPeriodTime[],
): number {
  return (
    days.find((day) => periodTimes.some((row) => row.day_of_week === day)) ??
    days[0] ??
    1
  );
}

/** Postgres TIME comes back as "HH:MM:SS" — trim to "HH:MM" for display. */
function trimToHHMM(value: string): string {
  return value.slice(0, 5);
}

/**
 * Periods after which there's a real time gap on the representative day (a
 * lunch break, a flag-ceremony break, etc.) — rendered as a spacer column
 * showing just the break's time range, not "คาบ N", so it doesn't look like
 * a period. Keyed by the period the gap follows.
 */
function getGapAfterPeriods(
  periods: number[],
  periodTimes: SchoolPeriodTime[],
  representativeDay: number,
): Map<number, { startsAt: string; endsAt: string }> {
  const gaps = new Map<number, { startsAt: string; endsAt: string }>();
  for (let i = 0; i < periods.length - 1; i += 1) {
    const current = periodTimes.find(
      (row) =>
        row.day_of_week === representativeDay && row.period === periods[i],
    );
    const next = periodTimes.find(
      (row) =>
        row.day_of_week === representativeDay && row.period === periods[i + 1],
    );
    if (current && next && hoursBetween(current.ends_at, next.starts_at) > 0) {
      gaps.set(periods[i], {
        startsAt: current.ends_at,
        endsAt: next.starts_at,
      });
    }
  }
  return gaps;
}

/**
 * A slot's teacher(s) as name text (one teacher) or a stack of small avatars
 * (co-taught — real photo when the teacher has one, initials otherwise, same
 * as everywhere else in the app). Shared by `TimetableGrid`'s default cell
 * and `TimetablePage`'s custom `renderSlot` so both stay in sync.
 */
export function TimetableSlotTeachers({
  onTeacherClick,
  slot,
}: {
  onTeacherClick?: (teacherId: number) => void;
  slot: TimetableSlot;
}) {
  const teachers = slot.teachers ?? [];
  if (teachers.length <= 1) {
    return (
      <div className="mt-0.5 line-clamp-1 break-words text-xs leading-4 text-slate-500">
        {teachers[0]?.name ?? slot.teacher_name ?? "ไม่ระบุครูผู้สอน"}
      </div>
    );
  }
  const visible = teachers.slice(0, 3);
  const overflow = teachers.length - visible.length;
  return (
    <div className="mt-1 flex items-center -space-x-1.5">
      {visible.map((teacher, index) => {
        const label = teacher.name ?? "ไม่ระบุครูผู้สอน";
        const avatar = (
          <Avatar
            className="rounded-full border border-white text-[9px] font-semibold"
            gradientName={label}
            imageAlt=""
            imageUrl={resolveApiMediaUrl(teacher.photoUrl)}
            style={{ width: 18, height: 18 }}
          />
        );
        return (
          // Same ring-on-hover treatment every clickable avatar in the app
          // uses, for visual consistency — but this stack has no single
          // profile to open, so on top of that it adds a name tooltip
          // (HoverTooltip, not a native `title`) since a stack of bare
          // initials/photos is otherwise anonymous.
          <HoverTooltip key={`${slot.id}-${teacher.id}-${index}`} label={label}>
            {onTeacherClick ? (
              <button
                aria-label={`เปิดข้อมูลครู ${label}`}
                className="block rounded-full transition-shadow hover:ring-2 hover:ring-primary/30 focus-visible:outline-none"
                onClick={() => onTeacherClick(teacher.id)}
                type="button"
              >
                {avatar}
              </button>
            ) : (
              avatar
            )}
          </HoverTooltip>
        );
      })}
      {overflow > 0 ? (
        <span className="pl-1 text-[10px] font-semibold leading-none text-slate-500">
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}

interface TimetableGridProps {
  slots: TimetableSlot[];
  periodTimes: SchoolPeriodTime[];
  /** Include every school-configured day/period even when no subject is assigned there. */
  includeConfiguredSchedule?: boolean;
  /** Render a cell's content for one slot; omit for the default subject+teacher label. */
  renderSlot?: (slot: TimetableSlot) => ReactNode;
  emptyDescription?: string;
  /** When true, strips the outer card wrapper (border, rounded, shadow) — use when the grid is already inside a card container. */
  borderless?: boolean;
  /**
   * Manage-view only: when provided, an empty cell shows a "+" (hover-reveal,
   * same feel as the edit/delete affordance on a filled cell) that calls back
   * with the cell's day/period. Also switches day/period rows to include
   * everything the bell schedule defines, not just already-assigned slots —
   * a read-only personal schedule should stay compact instead of showing the
   * whole school's configured grid, so this is opt-in.
   */
  onAddSlot?: (dayOfWeek: number, period: number) => void;
  /**
   * Manage-view only, same as `onAddSlot`: opens a teacher's edit page when
   * their avatar is clicked. Omit on a read-only schedule (e.g. a teacher's
   * own view via teacher-access) — that viewer usually can't reach
   * `/manage-teachers/:id/edit` and clicking through to it would just 403.
   */
  onTeacherClick?: (teacherId: number) => void;
}

export function TimetableGrid({
  borderless = false,
  emptyDescription,
  includeConfiguredSchedule = false,
  onAddSlot,
  onTeacherClick,
  periodTimes,
  renderSlot,
  slots,
}: TimetableGridProps) {
  const showConfiguredSchedule =
    includeConfiguredSchedule || Boolean(onAddSlot);
  if (
    slots.length === 0 &&
    !(showConfiguredSchedule && periodTimes.length > 0)
  ) {
    return (
      <EmptyState
        description={emptyDescription ?? "ยังไม่มีการจัดคาบสอนสำหรับตารางนี้"}
        icon={CalendarClock}
        title="ไม่มีตารางสอน"
      />
    );
  }

  const days = getGridDays(slots, periodTimes, showConfiguredSchedule);
  const periods = getGridPeriods(slots, periodTimes, showConfiguredSchedule);
  const representativeDay = getRepresentativeDay(days, periodTimes);
  // A period can end up in `periods` purely because a subject is still
  // assigned there (via `slots`) even though the bell schedule was later
  // shrunk past it — e.g. going from 8 periods/day back to 7 doesn't touch
  // existing subject assignments in period 8. Flag that case distinctly so
  // it doesn't read as "just hasn't been configured yet" (implying it's new)
  // when it's actually orphaned data outside today's bell schedule that the
  // admin should reassign or delete.
  const periodsInBellSchedule = new Set(periodTimes.map((row) => row.period));
  const gapAfterPeriods = getGapAfterPeriods(
    periods,
    periodTimes,
    representativeDay,
  );
  const columns = periods.flatMap((period) =>
    gapAfterPeriods.has(period)
      ? [
          { kind: "period" as const, period },
          { kind: "gap" as const, key: `gap-${period}`, afterPeriod: period },
        ]
      : [{ kind: "period" as const, period }],
  );
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
          style={{
            tableLayout: "fixed",
            minWidth: `${columns.length * 108 + 80}px`,
          }}
        >
          <colgroup>
            <col style={{ width: "80px" }} />
            {columns.map((column) => (
              <col key={column.kind === "gap" ? column.key : column.period} />
            ))}
          </colgroup>
          <thead>
            <tr className="border-b border-white/20 bg-primary">
              <th className="bg-primary px-3 py-4 text-sm font-bold uppercase tracking-wider text-white">
                วัน
              </th>
              {columns.map((column) => {
                if (column.kind === "gap") {
                  const gap = gapAfterPeriods.get(column.afterPeriod);
                  return (
                    <th
                      className="px-1 py-4 text-center align-top text-sm font-bold"
                      key={column.key}
                    >
                      {gap ? (
                        <>
                          <div className="invisible" aria-hidden="true">
                            .
                          </div>
                          <div className="mt-0.5 whitespace-nowrap text-xs font-normal leading-tight text-white/75">
                            {trimToHHMM(gap.startsAt)}–{trimToHHMM(gap.endsAt)}
                          </div>
                        </>
                      ) : null}
                    </th>
                  );
                }
                const period = column.period;
                const isOutsideBellSchedule = showConfiguredSchedule
                  ? !periodsInBellSchedule.has(period)
                  : false;
                return (
                  <th
                    className="px-2 py-4 align-top text-sm font-bold text-white"
                    key={period}
                  >
                    <div>คาบ {period}</div>
                    <div
                      className={cn(
                        "mt-0.5 font-normal",
                        isOutsideBellSchedule
                          ? "text-warning-100"
                          : "text-white/75",
                      )}
                    >
                      {isOutsideBellSchedule
                        ? "นอกตารางเวลาปัจจุบัน"
                        : getPeriodTimeLabel(
                            periodTimes,
                            representativeDay,
                            period,
                          )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr
                className="border-b border-slate-100 last:border-b-0"
                key={day}
              >
                <td className="whitespace-nowrap bg-white px-3 align-middle text-sm font-bold text-slate-800">
                  {DAY_LABELS[day]}
                </td>
                {columns.map((column) => {
                  if (column.kind === "gap") {
                    return (
                      <td
                        aria-hidden="true"
                        className="border-l border-slate-100 bg-slate-50 p-0"
                        key={column.key}
                      />
                    );
                  }
                  const period = column.period;
                  const cellSlots =
                    slotsByDayAndPeriod.get(`${day}-${period}`) ?? [];
                  return (
                    <td className="border-l border-slate-100 p-0" key={period}>
                      <div
                        className="px-2 py-2"
                        style={{
                          height: "88px",
                          maxHeight: "88px",
                          overflow: "hidden",
                        }}
                      >
                        {cellSlots.length === 0 ? (
                          onAddSlot ? (
                            <button
                              aria-label={`เพิ่มคาบสอน วัน${DAY_LABELS[day]} คาบ ${period}`}
                              className="group/add relative flex h-full w-full items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-primary-soft hover:text-primary focus-visible:bg-primary-soft focus-visible:text-primary focus-visible:outline-none"
                              onClick={() => onAddSlot(day, period)}
                              type="button"
                            >
                              <span className="transition-opacity group-hover/add:opacity-0 group-focus-visible/add:opacity-0">
                                —
                              </span>
                              <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover/add:opacity-100 group-focus-visible/add:opacity-100">
                                <Plus aria-hidden="true" className="size-5" />
                              </span>
                            </button>
                          ) : (
                            <div className="flex h-full items-center justify-center text-slate-300">
                              —
                            </div>
                          )
                        ) : (
                          <div className="space-y-1.5">
                            {cellSlots.map((slot) =>
                              renderSlot ? (
                                <div key={slot.id}>{renderSlot(slot)}</div>
                              ) : (
                                <div
                                  className="relative overflow-hidden rounded-lg border border-slate-200 bg-white px-2.5 py-2"
                                  key={slot.id}
                                  style={{
                                    height: "72px",
                                    maxHeight: "72px",
                                    overflow: "hidden",
                                  }}
                                >
                                  <span
                                    aria-hidden="true"
                                    className="absolute inset-x-0 top-0 h-1 bg-primary/60"
                                  />
                                  <div className="line-clamp-2 break-words text-sm font-bold leading-5 text-slate-900">
                                    {slot.subject_name_th}
                                  </div>
                                  <TimetableSlotTeachers
                                    onTeacherClick={onTeacherClick}
                                    slot={slot}
                                  />
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
