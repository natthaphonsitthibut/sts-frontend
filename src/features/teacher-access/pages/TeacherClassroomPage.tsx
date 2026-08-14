import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  History,
  MessageSquareText,
  UserRound,
  Wrench,
} from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  DatePicker,
  DropdownMenu,
  FormErrorAlert,
  IconButton,
  Label,
  Select,
  Skeleton,
  Tabs,
} from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  type DataTableSortState,
} from "../../../components/layout/data-table";
import {
  EmptyState,
  ErrorState,
  FilterSelect,
  SearchInput,
  ToolbarControls,
} from "../../../components/layout/page-primitives";
import {
  PAGE_ICONS,
  PAGE_IDENTITIES,
} from "../../../components/layout/page-identity";
import { NavButton } from "../../../components/layout/nav-button";
import { getThaiDateKey } from "../../../lib/date-time";
import { useBlobObjectUrl } from "../../../hooks/useBlobObjectUrl";
import { useRouteTab } from "../../../hooks/useRouteTab";
import { AttendanceRosterTable } from "../../attendance/components/AttendanceRosterTable";
import type { AttendanceSelectionStatus } from "../../attendance/types/attendance.types";
import { usePublicAttendanceStatusCatalog } from "../../status-catalog/hooks/useStatusCatalog";
import { ClassroomStudentCommentDialog } from "../../school-structure/components/ClassroomStudentCommentDialog";
import { ClassroomTableExportDialog } from "../../school-structure/components/ClassroomTableExportDialog";
import {
  RISK_TIER_ORDER,
  RISK_TIER_PRESENTATION,
} from "../../students/lib/risk-tier-presentation";
import { TeacherLinkShell } from "../components/TeacherLinkShell";
import { TeacherAccessStudentAvatar } from "../components/TeacherAccessStudentAvatar";
import {
  useCreateTeacherStudentComment,
  useRecordTeacherClassroomExport,
  useSaveTeacherAccessAttendance,
  useTeacherAccessAttendanceSlots,
  useTeacherAccessRoster,
  useTeacherStudentPhoto,
} from "../hooks/useTeacherAccess";
import { useTeacherLink } from "../hooks/useTeacherLink";
import {
  assignmentClassLabel,
  assignmentSubjectLabel,
  studentDisplayName,
} from "../lib/teacher-link-presentation";
import type { TeacherAccessRosterStudent } from "../types/teacher-access.types";

type AttendanceStatus = Exclude<AttendanceSelectionStatus, "NONE">;
const STUDENTS_ICON = PAGE_IDENTITIES["/students"].icon;
const CLASSROOM_ICON = PAGE_ICONS["school-building"];
const ROSTER_EXPORT_COLUMNS = [
  { key: "order", label: "ลำดับ" },
  { key: "studentNumber", label: "รหัสประจำตัว" },
  { key: "name", label: "ชื่อ-นามสกุล" },
  { key: "comment", label: "หมายเหตุ" },
  { key: "status", label: "สถานะความเสี่ยง" },
] as const;

function rosterSortValue(
  student: TeacherAccessRosterStudent,
  key: string,
): string {
  if (key === "studentNumber") return student.studentNumber ?? "";
  if (key === "name") return studentDisplayName(student);
  if (key === "comment") return student.teacherComment ?? "";
  if (key === "status") {
    return RISK_TIER_PRESENTATION[student.riskTier ?? "NORMAL"]?.label ?? "";
  }
  return "";
}

function sortRoster(
  students: readonly TeacherAccessRosterStudent[],
  sort: DataTableSortState | undefined,
): TeacherAccessRosterStudent[] {
  if (!sort) return [...students];
  return [...students].sort((a, b) => {
    const result = rosterSortValue(a, sort.key).localeCompare(
      rosterSortValue(b, sort.key),
      "th",
    );
    return sort.direction === "asc" ? result : -result;
  });
}

/**
 * One class as the teacher sees it through their link — the same two views the
 * school staff get on ห้องเรียนทั้งหมด (รายชื่อ / เช็คชื่อ), minus the actions a
 * link holder must not have. QR, delegation and file import arrive with their
 * own features; the เครื่องมือ menu only lists what already works.
 */
export function TeacherClassroomPage() {
  const navigate = useNavigate();
  const { assignmentId = "" } = useParams();
  const { credential, context } = useTeacherLink();
  // The link has no session, so colours come from the public catalog endpoint —
  // the authenticated one would 401 and silently fall back to default styling.
  const attendanceStatusCatalog = usePublicAttendanceStatusCatalog().data ?? [];
  const [tab, setTab] = useRouteTab(
    {
      roster: `/teacher-access/classes/${assignmentId}/roster`,
      attendance: `/teacher-access/classes/${assignmentId}/attendance`,
    },
    "roster",
  );
  const [search, setSearch] = useState("");
  const [riskTier, setRiskTier] = useState("");
  const [date, setDate] = useState(getThaiDateKey);
  const [timetableSlotId, setTimetableSlotId] = useState("");
  const [attendance, setAttendance] = useState<
    Record<string, AttendanceStatus>
  >({});
  const [saved, setSaved] = useState(false);
  const [rosterSort, setRosterSort] = useState<DataTableSortState | undefined>({
    key: "name",
    direction: "asc",
  });
  const [attendanceSort, setAttendanceSort] = useState<DataTableSortState | undefined>({
    key: "studentNumber",
    direction: "asc",
  });
  const [exportOpen, setExportOpen] = useState(false);
  const [commentStudent, setCommentStudent] =
    useState<TeacherAccessRosterStudent | null>(null);
  const commentPhotoQuery = useTeacherStudentPhoto(
    Number(assignmentId) || undefined,
    commentStudent?.studentUuid,
    Boolean(commentStudent?.hasPhoto),
  );
  const commentPhotoUrl = useBlobObjectUrl(commentPhotoQuery.data);
  const createComment = useCreateTeacherStudentComment(
    Number(assignmentId) || 0,
  );
  const recordExport = useRecordTeacherClassroomExport();

  const assignment = context.assignments.find(
    (item) => item.id === assignmentId,
  );
  const canRecordAttendance =
    assignment?.allowedActions.some(
      (action) =>
        action === "HOMEROOM_ATTENDANCE" || action === "SUBJECT_ATTENDANCE",
    ) ?? false;
  useEffect(() => {
    if (assignment && tab === "attendance" && !canRecordAttendance) {
      void navigate(`/teacher-access/classes/${assignmentId}/roster`, {
        replace: true,
      });
    }
  }, [assignment, assignmentId, canRecordAttendance, navigate, tab]);
  const rosterQuery = useTeacherAccessRoster(
    credential,
    Number(assignmentId) || undefined,
  );
  const saveAttendance = useSaveTeacherAccessAttendance(credential);
  const attendanceSlotsQuery = useTeacherAccessAttendanceSlots(
    credential,
    Number(assignmentId) || undefined,
    date,
    assignment?.assignmentKind === "SUBJECT",
  );
  const roster = useMemo(() => rosterQuery.data ?? [], [rosterQuery.data]);
  const filteredRoster = useMemo(() => {
    const term = search.trim().toLowerCase();
    return roster.filter((student) => {
      const matchesSearch =
        !term ||
        `${studentDisplayName(student)} ${student.studentNumber ?? ""}`
          .toLowerCase()
          .includes(term);
      const matchesTier =
        !riskTier || (student.riskTier ?? "NORMAL") === riskTier;
      return matchesSearch && matchesTier;
    });
  }, [roster, riskTier, search]);
  const visibleRoster = useMemo(
    () => sortRoster(filteredRoster, rosterSort),
    [filteredRoster, rosterSort],
  );
  const visibleAttendanceRoster = useMemo(() => {
    return sortRoster(filteredRoster, attendanceSort);
  }, [attendanceSort, filteredRoster]);

  if (!assignment) {
    return (
      <TeacherLinkShell centered contentClassName="max-w-lg">
        <ErrorState
          description="ห้องนี้ไม่ได้อยู่ในลิงก์ของคุณ หรือถูกปิดใช้งานแล้ว"
          title="ไม่พบห้องเรียน"
        />
      </TeacherLinkShell>
    );
  }

  const classroomLabel = assignmentClassLabel(assignment);
  const attendanceSlots = attendanceSlotsQuery.data ?? [];
  const requiresPeriodSelection =
    assignment.assignmentKind === "SUBJECT" && attendanceSlots.length > 1;
  const hasScheduledSubjectSlot =
    assignment.assignmentKind !== "SUBJECT" || attendanceSlots.length > 0;
  const selectedTimetableSlotId = requiresPeriodSelection
    ? Number(timetableSlotId) || undefined
    : attendanceSlots[0]?.id;

  async function submitAttendance(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (roster.length === 0) return;
    if (
      !hasScheduledSubjectSlot ||
      (requiresPeriodSelection && !selectedTimetableSlotId)
    )
      return;
    await saveAttendance.mutateAsync({
      assignmentId: Number(assignmentId),
      ...(selectedTimetableSlotId
        ? { timetableSlotId: selectedTimetableSlotId }
        : {}),
      date,
      records: roster.map((student) => ({
        studentId: student.studentUuid,
        status: attendance[student.studentUuid] ?? "P_PRESENT",
      })),
    });
    setSaved(true);
  }

  return (
    <TeacherLinkShell
      breadcrumb={[
        {
          label: "ห้องเรียนของฉัน",
          icon: PAGE_ICONS["school-building"],
          to: "/teacher-access",
        },
      ]}
      icon={CLASSROOM_ICON}
      navigation={
        <NavButton icon={ArrowLeft} to="/teacher-access" variant="outline">
          ย้อนกลับ
        </NavButton>
      }
      title={
        <>
          ห้อง {classroomLabel}{" "}
          <span className="text-lg font-medium text-slate-500">
            ({assignmentSubjectLabel(assignment)})
          </span>
        </>
      }
    >
      <div className="mb-6">
        <Tabs
          aria-label="ข้อมูลห้องเรียน"
          className="flex w-full"
          onChange={setTab}
          options={[
            { value: "roster", label: "รายชื่อ" },
            ...(canRecordAttendance
              ? [{ value: "attendance", label: "เช็คชื่อ" }]
              : []),
          ]}
          value={tab}
        />
      </div>

      <ToolbarControls className="mb-5">
        <SearchInput
          className="sm:max-w-[560px]"
          onChange={setSearch}
          placeholder="ค้นหา"
          value={search}
        />
        {tab === "roster" ? (
          <>
            <FilterSelect
              ariaLabel="กรองสถานะความเสี่ยง"
              onChange={setRiskTier}
              value={riskTier}
            >
              <option value="">สถานะทั้งหมด</option>
              {RISK_TIER_ORDER.map((value) => (
                <option key={value} value={value}>
                  {RISK_TIER_PRESENTATION[value].label}
                </option>
              ))}
            </FilterSelect>
            <Button
              className="sm:ml-auto"
              disabled={visibleRoster.length === 0}
              icon={Download}
              onClick={() => setExportOpen(true)}
            >
              ดาวน์โหลดข้อมูล
            </Button>
          </>
        ) : (
          <>
            <DropdownMenu
              align="start"
              ariaLabel="เครื่องมือการเช็คชื่อ"
              items={[
                {
                  id: "qr",
                  label: "สแกน QR Code เพื่อเช็คชื่อ (เร็ว ๆ นี้)",
                  disabled: true,
                  onSelect: () => undefined,
                },
                {
                  id: "delegate",
                  label: "มอบหมายการเช็คชื่อ (เร็ว ๆ นี้)",
                  disabled: true,
                  onSelect: () => undefined,
                },
                {
                  id: "import",
                  label: "นำเข้าไฟล์การเช็คชื่อ (เร็ว ๆ นี้)",
                  disabled: true,
                  onSelect: () => undefined,
                },
              ]}
              trigger={(triggerProps) => (
                <Button {...triggerProps} icon={Wrench} variant="outline">
                  เครื่องมือ
                </Button>
              )}
            />
            <Button
              className="sm:ml-auto"
              icon={History}
              onClick={() =>
                void navigate(
                  `/teacher-access/classes/${assignmentId}/history/attendance`,
                )
              }
            >
              ประวัติการเช็คชื่อ
            </Button>
          </>
        )}
      </ToolbarControls>

      {rosterQuery.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : rosterQuery.isError ? (
        <ErrorState
          description="กรุณาลองโหลดรายชื่อของห้องนี้อีกครั้ง"
          onRetry={() => void rosterQuery.refetch()}
          title="โหลดรายชื่อนักเรียนไม่สำเร็จ"
        />
      ) : visibleRoster.length === 0 ? (
        <EmptyState
          description={
            search || riskTier
              ? "ลองเปลี่ยนคำค้นหาหรือตัวกรองสถานะ"
              : "ห้องนี้ยังไม่มีนักเรียนที่อยู่ในสถานะใช้งาน"
          }
          icon={STUDENTS_ICON}
          title="ไม่พบรายชื่อนักเรียน"
        />
      ) : tab === "roster" ? (
        <DataTable
          headings={[
            { label: "ลำดับ" },
            { label: "รูปประจำตัว", className: "text-center" },
            { label: "รหัสประจำตัว", sortKey: "studentNumber" },
            { label: "ชื่อ-นามสกุล", sortKey: "name" },
            { label: "หมายเหตุ", sortKey: "comment" },
            {
              label: "สถานะความเสี่ยง",
              sortKey: "status",
              className: "text-center",
            },
            { label: "เครื่องมือ", className: "text-center" },
          ]}
          minWidthClassName="min-w-[1040px]"
          onSortChange={setRosterSort}
          responsive={false}
          sort={rosterSort}
        >
          {visibleRoster.map((student, index) => {
            const fullName = studentDisplayName(student);
            const tier = student.riskTier ?? "NORMAL";
            return (
              <DataTableRow key={student.studentUuid}>
                <DataTableCell className="tabular-nums">
                  {index + 1}
                </DataTableCell>
                <DataTableCell>
                  <div className="flex justify-center">
                    <button
                      aria-label={`เปิดข้อมูลนักเรียน ${fullName}`}
                      className="rounded-full transition-shadow hover:ring-2 hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      onClick={() =>
                        void navigate(
                          `/teacher-access/classes/${assignmentId}/students/${student.studentUuid}`,
                        )
                      }
                      type="button"
                    >
                      <TeacherAccessStudentAvatar
                        assignmentId={Number(assignmentId)}
                        student={student}
                      />
                    </button>
                  </div>
                </DataTableCell>
                <DataTableCell className="font-medium tabular-nums">
                  {student.studentNumber ?? "-"}
                </DataTableCell>
                <DataTableCell className="font-medium text-slate-900">
                  {fullName}
                </DataTableCell>
                <DataTableCell className="max-w-[360px] text-slate-700">
                  {student.teacherComment?.trim() || "-"}
                </DataTableCell>
                <DataTableCell>
                  <div className="flex justify-center">
                    <Badge
                      data-student-risk-tier={tier}
                      variant={
                        RISK_TIER_PRESENTATION[tier]?.badge ?? "destructive"
                      }
                    >
                      {RISK_TIER_PRESENTATION[tier]?.label ?? tier}
                    </Badge>
                  </div>
                </DataTableCell>
                <DataTableCell>
                  <div className="flex justify-center gap-2">
                    <IconButton
                      aria-label={`ดูข้อมูล ${fullName}`}
                      icon={UserRound}
                      onClick={() =>
                        void navigate(
                          `/teacher-access/classes/${assignmentId}/students/${student.studentUuid}`,
                        )
                      }
                      variant="edit"
                    />
                    <IconButton
                      aria-label={`เพิ่มความคิดเห็นของ ${fullName}`}
                      icon={MessageSquareText}
                      onClick={() => setCommentStudent(student)}
                      variant="comment"
                    />
                  </div>
                </DataTableCell>
              </DataTableRow>
            );
          })}
        </DataTable>
      ) : (
        <form onSubmit={(event) => void submitAttendance(event)}>
          <div className="mb-4 w-[270px] max-w-full">
            <Label htmlFor="attendance-date">วันที่</Label>
            <DatePicker
              ariaLabel="เลือกวันที่เช็คชื่อ"
              id="attendance-date"
              max={getThaiDateKey()}
              onChange={(value) => {
                setDate(value);
                setTimetableSlotId("");
                setSaved(false);
              }}
              value={date}
            />
          </div>
          {assignment.assignmentKind === "SUBJECT" &&
          !attendanceSlotsQuery.isLoading ? (
            <div className="mb-4 w-[270px] max-w-full">
              {hasScheduledSubjectSlot ? (
                requiresPeriodSelection ? (
                  <>
                    <Label htmlFor="attendance-period">คาบเรียน</Label>
                    <Select
                      id="attendance-period"
                      onChange={(event) => {
                        setTimetableSlotId(event.target.value);
                        setSaved(false);
                      }}
                      value={timetableSlotId}
                    >
                      <option value="">เลือกคาบเรียน</option>
                      {attendanceSlots.map((slot) => (
                        <option key={slot.id} value={String(slot.id)}>
                          คาบ {slot.period}
                        </option>
                      ))}
                    </Select>
                  </>
                ) : (
                  <Alert>
                    <AlertDescription>
                      เช็คชื่อคาบ {attendanceSlots[0]?.period}
                    </AlertDescription>
                  </Alert>
                )
              ) : (
                <Alert variant="warning">
                  <AlertDescription>
                    คุณไม่มีคาบสอนวิชานี้ในวันที่เลือก
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : null}
          <AttendanceRosterTable
            catalog={attendanceStatusCatalog}
            onSortChange={setAttendanceSort}
            onStatusChange={(studentId, status) => {
              setAttendance((values) => ({ ...values, [studentId]: status }));
              setSaved(false);
            }}
            rows={visibleAttendanceRoster.map((student) => ({
              id: student.studentUuid,
              name: studentDisplayName(student),
              studentNumber: student.studentNumber,
              avatar: (
                <TeacherAccessStudentAvatar
                  assignmentId={Number(assignmentId)}
                  student={student}
                />
              ),
            }))}
            selections={attendance}
            sort={attendanceSort}
          />

          <div className="mt-4 space-y-3">
            <FormErrorAlert
              error={saveAttendance.error}
              fallback="ไม่สามารถบันทึกการเช็คชื่อได้"
            />
            {saved ? (
              <Alert variant="success">
                <AlertTitle className="flex items-center gap-2">
                  <CheckCircle2 aria-hidden="true" className="size-4" />
                  บันทึกเรียบร้อย
                </AlertTitle>
                <AlertDescription>
                  ระบบบันทึกสถานะของนักเรียน {roster.length} คนแล้ว
                </AlertDescription>
              </Alert>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                disabled={
                  attendanceSlotsQuery.isLoading ||
                  !hasScheduledSubjectSlot ||
                  (requiresPeriodSelection && !selectedTimetableSlotId)
                }
                isLoading={saveAttendance.isPending}
                loadingText="กำลังบันทึก"
                type="submit"
              >
                บันทึกการเช็คชื่อ {roster.length} คน
              </Button>
            </div>
          </div>
        </form>
      )}

      <ClassroomStudentCommentDialog
        classroomId={Number(assignment.classroomId)}
        isSubmitting={createComment.isPending}
        onOpenChange={(open) => {
          if (!open) setCommentStudent(null);
        }}
        student={
          commentStudent
            ? { ...commentStudent, photoUrl: commentPhotoUrl }
            : null
        }
        submitComment={async ({ studentUuid, commentText }) => {
          await createComment.mutateAsync({ studentUuid, commentText });
          await rosterQuery.refetch();
        }}
        submitError={createComment.error}
      />

      <ClassroomTableExportDialog
        authorizeExport={async (format, columns) => {
          await recordExport.mutateAsync({
            assignmentId: Number(assignmentId),
            exportScope: "ROSTER",
            format,
            columns,
          });
        }}
        columns={ROSTER_EXPORT_COLUMNS}
        fileName={`roster-${classroomLabel.replace("/", "-")}`}
        loadRows={() =>
          Promise.resolve(
            visibleRoster.map((student, index) => ({
              order: String(index + 1),
              studentNumber: student.studentNumber ?? "-",
              name: studentDisplayName(student),
              comment: student.teacherComment?.trim() || "-",
              status:
                RISK_TIER_PRESENTATION[student.riskTier ?? "NORMAL"]?.label ??
                "-",
            })),
          )
        }
        onOpenChange={setExportOpen}
        open={exportOpen}
        title={`รายชื่อนักเรียน ห้อง ${classroomLabel}`}
      />
    </TeacherLinkShell>
  );
}
