import { useMemo, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Pencil,
  Plus,
  WandSparkles,
} from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Combobox,
  Input,
  Label,
  Select,
} from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
} from "../../../components/layout/data-table";
import { Pagination } from "../../../components/layout/pagination";
import {
  EmptyState,
  ErrorState,
  PageShell,
  PageToolbar,
  SkeletonTable,
  SummaryMetrics,
  ToolbarControls,
} from "../../../components/layout/page-primitives";
import { getApiErrorMessage } from "../../../lib/api-error";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../../lib/pagination";
import { hasPermission } from "../../auth/lib/permissions";
import { useAuthSessionStore } from "../../auth/store/auth-session.store";
import { attendanceService } from "../api/attendance.service";
import { SchoolAreaSchoolFilter } from "../components/SchoolAreaSchoolFilter";
import { SchoolTermDialog, type SchoolTermFormValues } from "../components/SchoolTermDialog";
import { resolveAttendanceScopeLock } from "../lib/attendance-scope";
import { getTodayIso } from "../lib/attendance-presentation";
import { useSchoolAreaFilter } from "../hooks/useSchoolAreaFilter";
import type {
  AttendanceReconciliationItem,
  CalendarDayType,
  SchoolTerm,
} from "../types/attendance.types";

const STATUS_META: Record<
  AttendanceReconciliationItem["operationalStatus"],
  { label: string; variant: "success" | "warning" | "destructive" }
> = {
  COMPLETED: { label: "ครบ", variant: "success" },
  MISSING: { label: "ยังไม่เช็ค", variant: "destructive" },
  INCOMPLETE: { label: "ไม่ครบ", variant: "warning" },
};

function ScopeField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function AttendanceOperationsPage() {
  const queryClient = useQueryClient();
  const user = useAuthSessionStore((state) => state.user);
  const scope = useMemo(() => resolveAttendanceScopeLock(user?.data_scope), [user]);
  const canManageCalendar = hasPermission(user?.permissions ?? [], "settings");
  const schoolArea = useSchoolAreaFilter();
  const [schoolInput, setSchoolInput] = useState("");
  const [termInput, setTermInput] = useState("");
  const [date, setDate] = useState(getTodayIso());
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [termDialogOpen, setTermDialogOpen] = useState(false);
  const [termDialogTerm, setTermDialogTerm] = useState<SchoolTerm | null>(null);
  const [calendarEdit, setCalendarEdit] = useState<{
    calendarDayId: string;
    dayType: CalendarDayType;
    reason: string;
  } | null>(null);

  const schoolId = scope.isSchoolLocked
    ? String(scope.lockedSchoolId ?? "")
    : schoolInput;
  const termsQuery = useQuery({
    queryKey: ["attendance-terms", schoolId],
    queryFn: () => attendanceService.getTerms(schoolId),
    enabled: Boolean(schoolId),
  });
  const terms = termsQuery.data ?? [];
  const selectedTerm = terms.find((term) => term.id === termInput) ?? terms[0] ?? null;
  const selectedTermId = selectedTerm?.id ?? "";
  const calendarQuery = useQuery({
    queryKey: ["attendance-calendar", selectedTermId],
    queryFn: () => attendanceService.getCalendar(selectedTermId),
    enabled: Boolean(selectedTermId),
  });
  const selectedCalendarDay = calendarQuery.data?.find((day) => day.date === date) ?? null;
  const calendarDayType =
    calendarEdit && calendarEdit.calendarDayId === selectedCalendarDay?.id
      ? calendarEdit.dayType
      : selectedCalendarDay?.dayType ?? "SCHOOL_DAY";
  const calendarReason =
    calendarEdit && calendarEdit.calendarDayId === selectedCalendarDay?.id
      ? calendarEdit.reason
      : selectedCalendarDay?.reason ?? "";
  const reconciliationQuery = useQuery({
    queryKey: ["attendance-reconciliation", selectedTermId, date, page, rowsPerPage],
    queryFn: () =>
      attendanceService.getReconciliation({
        termId: selectedTermId,
        date,
        page,
        limit: rowsPerPage,
      }),
    enabled: Boolean(selectedTermId && date),
    placeholderData: keepPreviousData,
  });

  const termMutation = useMutation({
    mutationFn: (values: SchoolTermFormValues) => {
      if (!schoolId) throw new Error("School is required");
      return attendanceService.upsertTerm({
        schoolId: Number(schoolId),
        ...values,
      });
    },
    onSuccess: async (term) => {
      setTermInput(term.id);
      setTermDialogOpen(false);
      setTermDialogTerm(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["attendance-terms", schoolId] }),
        queryClient.invalidateQueries({ queryKey: ["attendance-reconciliation"] }),
      ]);
    },
  });
  const generateMutation = useMutation({
    mutationFn: () => attendanceService.generateCalendar(selectedTermId, [1, 2, 3, 4, 5]),
    onSuccess: async () => {
      setCalendarEdit(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["attendance-calendar", selectedTermId] }),
        queryClient.invalidateQueries({ queryKey: ["attendance-terms", schoolId] }),
        queryClient.invalidateQueries({ queryKey: ["attendance-reconciliation"] }),
      ]);
    },
  });
  const calendarDayMutation = useMutation({
    mutationFn: () => {
      if (!selectedCalendarDay) throw new Error("Calendar day is missing");
      return attendanceService.updateCalendarDay(selectedCalendarDay.id, {
        dayType: calendarDayType,
        reason: calendarReason.trim() || undefined,
      });
    },
    onSuccess: async () => {
      setCalendarEdit(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["attendance-calendar", selectedTermId] }),
        queryClient.invalidateQueries({ queryKey: ["attendance-reconciliation"] }),
      ]);
    },
  });

  const summary = reconciliationQuery.data?.summary ?? {
    completed: 0,
    missing: 0,
    incomplete: 0,
  };
  const rows = reconciliationQuery.data?.rows ?? [];

  function handleSchoolChange(value: string): void {
    setSchoolInput(value);
    setTermInput("");
    setPage(1);
  }

  function handleDateChange(value: string): void {
    setDate(value);
    setPage(1);
    setCalendarEdit(null);
  }

  return (
    <PageShell>
      <PageToolbar
        icon={CalendarDays}
        title="ความครบถ้วนการเช็คชื่อ"
        description="ตรวจรอบเช็คชื่อรายวันตามภาคเรียนและปฏิทินโรงเรียน"
        actions={
          canManageCalendar && schoolId ? (
            <Button
              icon={Plus}
              onClick={() => {
                setTermDialogTerm(null);
                setTermDialogOpen(true);
              }}
            >
              เพิ่มภาคเรียน
            </Button>
          ) : undefined
        }
      >
        <ToolbarControls className="sm:grid sm:grid-cols-2 sm:items-end lg:grid-cols-3 xl:grid-cols-6">
          <SchoolAreaSchoolFilter
            area={schoolArea}
            onSchoolChange={handleSchoolChange}
            schoolId={schoolId}
            schoolLocked={scope.isSchoolLocked}
          />
          <ScopeField label="ภาคเรียน">
            <Combobox
              disabled={!schoolId}
              onChange={(value) => {
                setTermInput(value);
                setPage(1);
              }}
              options={terms.map((term) => ({
                value: term.id,
                label: `${term.academicYear}/${term.semester} · ${term.status}`,
              }))}
              searchable={false}
              value={selectedTermId}
            />
          </ScopeField>
          <ScopeField label="วันที่">
            <Input type="date" value={date} onChange={(event) => handleDateChange(event.target.value)} />
          </ScopeField>
        </ToolbarControls>
      </PageToolbar>

      {!schoolId ? (
        <EmptyState icon={CalendarDays} title="เลือกโรงเรียน" />
      ) : termsQuery.isError ? (
        <ErrorState title="ไม่สามารถโหลดภาคเรียนได้" onRetry={() => void termsQuery.refetch()} />
      ) : termsQuery.isLoading ? (
        <SkeletonTable rows={3} />
      ) : !selectedTerm ? (
        <EmptyState icon={CalendarDays} title="ยังไม่มีภาคเรียน" />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={selectedTerm.status === "ACTIVE" ? "success" : "secondary"}>
                {selectedTerm.status}
              </Badge>
              <span className="text-sm font-semibold text-slate-600">
                {selectedTerm.startsOn ?? "-"} ถึง {selectedTerm.endsOn ?? "-"}
              </span>
            </div>
            {canManageCalendar ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  icon={Pencil}
                  onClick={() => {
                    setTermDialogTerm(selectedTerm);
                    setTermDialogOpen(true);
                  }}
                  variant="outline"
                >
                  แก้ภาคเรียน
                </Button>
                <Button
                  icon={WandSparkles}
                  isLoading={generateMutation.isPending}
                  onClick={() => generateMutation.mutate()}
                  variant="outline"
                >
                  สร้างปฏิทิน
                </Button>
              </div>
            ) : null}
          </div>

          {canManageCalendar && selectedCalendarDay ? (
            <div className="grid gap-3 border-b border-slate-200 pb-5 sm:grid-cols-[180px_minmax(0,1fr)_auto] sm:items-end">
              <ScopeField label="ประเภทวัน">
                <Select
                  value={calendarDayType}
                  onChange={(event) =>
                    setCalendarEdit({
                      calendarDayId: selectedCalendarDay.id,
                      dayType: event.target.value as CalendarDayType,
                      reason: calendarReason,
                    })
                  }
                >
                  <option value="SCHOOL_DAY">วันเรียน</option>
                  <option value="HOLIDAY">วันหยุด</option>
                  <option value="CANCELLED">ยกเลิกการเรียน</option>
                </Select>
              </ScopeField>
              <ScopeField label="เหตุผล">
                <Input
                  value={calendarReason}
                  onChange={(event) =>
                    setCalendarEdit({
                      calendarDayId: selectedCalendarDay.id,
                      dayType: calendarDayType,
                      reason: event.target.value,
                    })
                  }
                />
              </ScopeField>
              <Button
                isLoading={calendarDayMutation.isPending}
                onClick={() => calendarDayMutation.mutate()}
              >
                บันทึกวัน
              </Button>
            </div>
          ) : null}

          {selectedTerm.status !== "ACTIVE" ? (
            <Alert variant="warning">
              <AlertTitle>ภาคเรียนยังไม่เปิดใช้งาน</AlertTitle>
              <AlertDescription>ตั้งช่วงวัน สร้างปฏิทิน แล้วเปลี่ยนสถานะเป็น ACTIVE</AlertDescription>
            </Alert>
          ) : null}

          {generateMutation.isError || calendarDayMutation.isError ? (
            <Alert variant="destructive">
              <AlertTitle>บันทึกปฏิทินไม่สำเร็จ</AlertTitle>
              <AlertDescription>
                {getApiErrorMessage(
                  generateMutation.error ?? calendarDayMutation.error,
                  "กรุณาลองอีกครั้ง",
                )}
              </AlertDescription>
            </Alert>
          ) : null}

          <SummaryMetrics
            items={[
              { label: "ครบ", value: summary.completed, tone: "success", icon: CheckCircle2 },
              { label: "ยังไม่เช็ค", value: summary.missing, tone: "danger", icon: Clock3 },
              { label: "ไม่ครบ", value: summary.incomplete, tone: "warning", icon: CircleAlert },
            ]}
          />

          {reconciliationQuery.isError ? (
            <ErrorState title="ไม่สามารถตรวจความครบถ้วนได้" onRetry={() => void reconciliationQuery.refetch()} />
          ) : reconciliationQuery.isLoading ? (
            <SkeletonTable />
          ) : rows.length === 0 ? (
            <EmptyState icon={CalendarDays} title="ไม่มีห้องเรียนที่ต้องเช็คในวันนี้" />
          ) : (
            <>
              <DataTable headings={["ชั้น / ห้อง", "รายชื่อ", "บันทึกแล้ว", "Revision", "สถานะ"]} responsive={false}>
                {rows.map((row) => {
                  const meta = STATUS_META[row.operationalStatus];
                  return (
                    <DataTableRow key={`${row.gradeLevelId}-${row.room}`}>
                      <DataTableCell className="font-bold">{row.grade} / {row.room}</DataTableCell>
                      <DataTableCell>{row.expectedRosterCount}</DataTableCell>
                      <DataTableCell>{row.recordedCount}</DataTableCell>
                      <DataTableCell>{row.revision ?? "-"}</DataTableCell>
                      <DataTableCell><Badge variant={meta.variant}>{meta.label}</Badge></DataTableCell>
                    </DataTableRow>
                  );
                })}
              </DataTable>
              <Pagination
                page={page}
                onPageChange={setPage}
                onRowsPerPageChange={(next) => {
                  setRowsPerPage(next);
                  setPage(1);
                }}
                rowsPerPage={rowsPerPage}
                rowsPerPageOptions={PAGE_SIZE_OPTIONS}
                totalCount={reconciliationQuery.data?.totalCount ?? 0}
              />
            </>
          )}
        </div>
      )}

      <SchoolTermDialog
        error={termMutation.error}
        isPending={termMutation.isPending}
        onClose={() => {
          setTermDialogOpen(false);
          setTermDialogTerm(null);
        }}
        onSubmit={async (values) => { await termMutation.mutateAsync(values); }}
        open={termDialogOpen}
        term={termDialogTerm}
      />
    </PageShell>
  );
}
