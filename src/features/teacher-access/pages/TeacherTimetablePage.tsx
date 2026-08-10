import { CalendarClock } from "lucide-react";
import { Skeleton } from "../../../components/base";
import {
  EmptyState,
  ErrorState,
} from "../../../components/layout/page-primitives";
import { PAGE_ICONS } from "../../../components/layout/page-identity";
import { formatClassLabel } from "../../../lib/room-presentation";
import { TimetableGrid } from "../../timetable/components/TimetableGrid";
import { TeacherLinkShell } from "../components/TeacherLinkShell";
import { useTeacherSchedule } from "../hooks/useTeacherAccess";
import { useTeacherLink } from "../hooks/useTeacherLink";

const TIMETABLE_ICON = PAGE_ICONS.calendar;

/**
 * ตารางสอนของฉัน as the link holder sees it — the same grid the staff screen
 * renders, read-only: a link never gains the จัดตาราง affordances, so no
 * add/edit callbacks are passed and the grid stays compact (assigned periods
 * only, not the school's whole configured schedule).
 */
export function TeacherTimetablePage() {
  const { context } = useTeacherLink();
  const scheduleQuery = useTeacherSchedule();
  const slots = scheduleQuery.data?.slots ?? [];
  const periodTimes = scheduleQuery.data?.periodTimes ?? [];

  return (
    <TeacherLinkShell
      icon={TIMETABLE_ICON}
      subtitle={`ปีการศึกษา ${context.academicYear} ภาคเรียนที่ ${context.semester} · ${context.schoolName}`}
      title="ตารางสอนของฉัน"
    >
      {scheduleQuery.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : scheduleQuery.isError ? (
        <ErrorState
          description="กรุณาลองโหลดตารางสอนของคุณอีกครั้ง"
          onRetry={() => void scheduleQuery.refetch()}
          title="โหลดตารางสอนไม่สำเร็จ"
        />
      ) : slots.length === 0 ? (
        <EmptyState
          description="ตารางสอนของคุณจะแสดงที่นี่เมื่อฝ่ายบริหารจัดตารางให้"
          icon={CalendarClock}
          title="คุณยังไม่มีตารางสอน"
        />
      ) : (
        <TimetableGrid
          includeConfiguredSchedule
          periodTimes={periodTimes}
          renderSlot={(slot) => (
            <div className="relative min-h-12 overflow-hidden rounded-lg border border-slate-200 bg-white px-2.5 py-2">
              <span
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-1 bg-primary/60"
              />
              <div className="line-clamp-2 text-sm font-bold leading-5 text-slate-900">
                {slot.subject_name_th}
              </div>
              <div className="mt-0.5 text-xs leading-4 text-slate-500">
                {formatClassLabel(slot.grade_label, slot.room_no)}
              </div>
            </div>
          )}
          slots={slots}
        />
      )}
    </TeacherLinkShell>
  );
}
