import { Download, MessageSquareText, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Badge,
  Button,
  IconButton,
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
  PageShell,
  PageToolbar,
  SearchInput,
  ToolbarControls,
} from "../../../components/layout/page-primitives";
import { Pagination } from "../../../components/layout/pagination";
import { useContextualNavigate } from "../../../components/layout/navigation-context";
import {
  PAGE_ICONS,
  PAGE_IDENTITIES,
} from "../../../components/layout/page-identity";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { useRouteTab } from "../../../hooks/useRouteTab";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../../lib/pagination";
import { StudentAvatar } from "../../students/components/StudentAvatar";
import { usePermissions } from "../../auth/hooks/usePermissions";
import {
  RISK_TIER_ORDER,
  RISK_TIER_PRESENTATION,
} from "../../students/lib/risk-tier-presentation";
import { ClassroomAttendanceHistory } from "../components/ClassroomAttendanceHistory";
import { ClassroomRosterExportDialog } from "../components/ClassroomRosterExportDialog";
import { ClassroomStudentCommentDialog } from "../components/ClassroomStudentCommentDialog";
import {
  useClassroomRoster,
  useSchoolClassroom,
} from "../hooks/useSchoolStructure";
import type { ClassroomRosterStudent } from "../types/school-structure.types";

const CLASSROOM_ICON = PAGE_ICONS["users-round"];
const STUDENTS_ICON = PAGE_IDENTITIES["/students"].icon;

export function ClassroomDetailPage() {
  const contextualNavigate = useContextualNavigate();
  const { can } = usePermissions();
  const { classroomId = "" } = useParams();
  const [tab, setTab] = useRouteTab(
    {
      roster: `/classrooms/${classroomId}/roster`,
      history: `/classrooms/${classroomId}/history`,
    },
    "roster",
  );
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState<DataTableSortState | undefined>({
    key: "name",
    direction: "asc",
  });
  const [exportOpen, setExportOpen] = useState(false);
  const [commentStudent, setCommentStudent] =
    useState<ClassroomRosterStudent | null>(null);
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const classroomQuery = useSchoolClassroom(classroomId || null);
  const classroom = classroomQuery.data;
  const rosterQuery = useClassroomRoster(
    classroomId
      ? {
          classroomId: Number(classroomId),
          search: debouncedSearch || undefined,
          riskTier: status || undefined,
          page,
          limit: rowsPerPage,
          sortBy: sort?.key as
            | "studentNumber"
            | "name"
            | "comment"
            | "status"
            | undefined,
          sortDirection: sort?.direction,
        }
      : null,
  );
  const roster = useMemo(
    () => rosterQuery.data?.data ?? [],
    [rosterQuery.data?.data],
  );
  const visibleRoster = roster;

  if (classroomQuery.isLoading) {
    return (
      <PageShell>
        <Skeleton className="h-9 w-80" />
        <Skeleton className="mt-6 h-12 w-full" />
        <Skeleton className="mt-6 h-96 w-full" />
      </PageShell>
    );
  }
  if (classroomQuery.isError || !classroom) {
    return (
      <PageShell>
        <ErrorState
          description="ไม่สามารถโหลดข้อมูลห้องเรียนได้ กรุณาลองใหม่อีกครั้ง"
          onRetry={() => void classroomQuery.refetch()}
        />
      </PageShell>
    );
  }

  const classroomLabel = `${classroom.gradeLabel}/${classroom.roomCode}`;
  const teacherName =
    classroom.homeroomTeacherName || "ยังไม่ได้กำหนดครูประจำชั้น";

  return (
    <PageShell>
      <PageToolbar
        icon={CLASSROOM_ICON}
        parentBreadcrumb={{ label: "ห้องเรียนทั้งหมด", to: "/classrooms" }}
        title={`ห้อง ${classroomLabel} (${teacherName})`}
      />
      <div className="mb-6">
        <Tabs
          aria-label="ข้อมูลห้องเรียน"
          className="flex w-full"
          onChange={setTab}
          options={[
            { value: "roster", label: "รายชื่อนักเรียน" },
            { value: "history", label: "ประวัติการเช็กชื่อ" },
          ]}
          value={tab}
        />
      </div>

      {tab === "roster" ? (
        <>
          <ToolbarControls className="mb-5">
            <SearchInput
              className="sm:max-w-[560px]"
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="ค้นหา"
              value={search}
            />
            <FilterSelect
              ariaLabel="กรองสถานะนักเรียน"
              onChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
              value={status}
            >
              <option value="">สถานะทั้งหมด</option>
              {RISK_TIER_ORDER.map((value) => (
                <option key={value} value={value}>
                  {RISK_TIER_PRESENTATION[value].label}
                </option>
              ))}
            </FilterSelect>
            {can("export-data") ? (
              <Button
                className="sm:ml-auto"
                disabled={visibleRoster.length === 0}
                icon={Download}
                onClick={() => setExportOpen(true)}
              >
                ดาวน์โหลดข้อมูล
              </Button>
            ) : null}
          </ToolbarControls>
          {rosterQuery.isLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : rosterQuery.isError ? (
            <ErrorState
              description="ไม่สามารถโหลดรายชื่อนักเรียนได้"
              onRetry={() => void rosterQuery.refetch()}
            />
          ) : visibleRoster.length === 0 ? (
            <EmptyState
              description="ลองเปลี่ยนคำค้นหาหรือตัวกรองสถานะ"
              icon={STUDENTS_ICON}
              title="ไม่พบรายชื่อนักเรียน"
            />
          ) : (
            <DataTable
              headings={[
                { label: "ลำดับ" },
                { label: "รูปประจำตัว", className: "text-center" },
                { label: "รหัสประจำตัว", sortKey: "studentNumber" },
                { label: "ชื่อ-นามสกุล", sortKey: "name" },
                { label: "หมายเหตุ", sortKey: "comment" },
                {
                  label: "สถานะนักเรียน",
                  sortKey: "status",
                  className: "text-center",
                },
                { label: "เครื่องมือ", className: "text-center" },
              ]}
              minWidthClassName="min-w-[1200px]"
              onSortChange={(nextSort) => {
                setSort(nextSort);
                setPage(1);
              }}
              responsive={false}
              sort={sort}
              footer={
                <div className="px-4 pb-4">
                  <Pagination
                    onPageChange={setPage}
                    onRowsPerPageChange={(value) => {
                      setRowsPerPage(value);
                      setPage(1);
                    }}
                    page={page}
                    rowsPerPage={rowsPerPage}
                    rowsPerPageOptions={PAGE_SIZE_OPTIONS}
                    totalCount={rosterQuery.data?.meta.totalCount ?? 0}
                    unitLabel="นักเรียน"
                  />
                </div>
              }
            >
              {visibleRoster.map((student, index) => {
                const fullName =
                  `${student.firstName ?? ""} ${student.lastName ?? ""}`.trim() ||
                  "-";
                return (
                  <DataTableRow key={student.studentUuid}>
                    <DataTableCell className="tabular-nums">
                      {(page - 1) * rowsPerPage + index + 1}
                    </DataTableCell>
                    <DataTableCell>
                      <div className="flex justify-center">
                        <button
                          aria-label={`เปิดข้อมูลนักเรียน ${fullName}`}
                          className="rounded-full transition-shadow hover:ring-2 hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          onClick={() =>
                            contextualNavigate(
                              `/students/${student.studentUuid}`,
                            )
                          }
                          type="button"
                        >
                          <StudentAvatar
                            name={fullName}
                            photoUrl={student.photoUrl}
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
                    <DataTableCell className="text-center">
                      <div className="flex justify-center">
                        <Badge
                          data-student-risk-tier={student.riskTier}
                          variant={
                            RISK_TIER_PRESENTATION[student.riskTier]?.badge ??
                            "destructive"
                          }
                        >
                          {RISK_TIER_PRESENTATION[student.riskTier]?.label ??
                            student.riskTier}
                        </Badge>
                      </div>
                    </DataTableCell>
                    <DataTableCell>
                      <div className="flex justify-center gap-2">
                        <IconButton
                          aria-label={`ดูข้อมูล ${fullName}`}
                          icon={UserRound}
                          onClick={() =>
                            contextualNavigate(
                              `/students/${student.studentUuid}`,
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
          )}
        </>
      ) : (
        <ClassroomAttendanceHistory
          classroomId={Number(classroom.id)}
          classroomLabel={classroomLabel}
        />
      )}
      <ClassroomRosterExportDialog
        classroomId={Number(classroom.id)}
        classroomLabel={classroomLabel}
        onOpenChange={setExportOpen}
        open={exportOpen}
        riskTier={status || undefined}
        search={debouncedSearch || undefined}
        sortBy={
          sort?.key as
            | "studentNumber"
            | "name"
            | "comment"
            | "status"
            | undefined
        }
        sortDirection={sort?.direction}
      />
      <ClassroomStudentCommentDialog
        classroomId={Number(classroom.id)}
        onOpenChange={(open) => {
          if (!open) setCommentStudent(null);
        }}
        student={commentStudent}
      />
    </PageShell>
  );
}
