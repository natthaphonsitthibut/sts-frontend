import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormErrorAlert,
  Label,
  Textarea,
  useConfirm,
} from "../../../components/base";
import { LinkShareDialog } from "../../../components/layout/link-share-dialog";
import { PAGE_IDENTITIES } from "../../../components/layout/page-identity";
import { Pagination } from "../../../components/layout/pagination";
import {
  EmptyState,
  ErrorState,
  FilterCombobox,
  PageShell,
  PageToolbar,
  SearchInput,
  SkeletonTable,
  ToolbarControls,
} from "../../../components/layout/page-primitives";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../../lib/pagination";
import { attendanceService } from "../../attendance/api/attendance.service";
import { useScopedSchools } from "../../school-structure/hooks/useSchoolStructure";
import { TeacherLinkTable } from "../components/TeacherLinkTable";
import {
  useIssueTeacherAccessGrant,
  useIssueTeacherAccessGrantsForTerm,
  useRevokeTeacherAccessGrant,
  useRotateTeacherAccessGrant,
  useTeacherAccessGrantLink,
  useTeacherLinkRoster,
} from "../hooks/useTeacherAccess";
import type { TeacherLinkRosterEntry } from "../types/teacher-access.types";
import type { DataTableSortState } from "../../../components/layout/data-table";

const PAGE_ICON = PAGE_IDENTITIES["/attendance-links"].icon;

export function TeacherAttendanceLinksPage() {
  const schoolsQuery = useScopedSchools();
  const schools = useMemo(() => schoolsQuery.data ?? [], [schoolsQuery.data]);
  const [schoolInput, setSchoolInput] = useState("");
  const [academicYearInput, setAcademicYearInput] = useState("");
  const [semesterInput, setSemesterInput] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState<DataTableSortState | undefined>();
  const [sharedUrl, setSharedUrl] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<TeacherLinkRosterEntry | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [bulkResult, setBulkResult] = useState<{ issued: number; skipped: number } | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirm();
  const search = useDebouncedValue(searchInput.trim(), 350);

  const multipleSchools = schools.length > 1;
  const schoolId = schools.length === 1 ? String(schools[0].id) : schoolInput;
  const selectedSchoolId = Number(schoolId) || undefined;

  const termsQuery = useQuery({
    queryKey: ["teacher-access", "terms", selectedSchoolId],
    queryFn: () => attendanceService.getTerms(selectedSchoolId!),
    enabled: Boolean(selectedSchoolId),
  });
  const terms = useMemo(() => termsQuery.data ?? [], [termsQuery.data]);
  const defaultTerm = useMemo(
    () => terms.find((term) => term.status === "ACTIVE") ?? terms[0],
    [terms],
  );
  const academicYear = Number(academicYearInput) || defaultTerm?.academicYear;
  const semester = Number(semesterInput) || defaultTerm?.semester;
  const selectedTerm = terms.find(
    (term) => term.academicYear === academicYear && term.semester === semester,
  );
  const selectedTermId = Number(selectedTerm?.id) || undefined;

  const academicYears = useMemo(
    () => [...new Set(terms.map((term) => term.academicYear))].sort((a, b) => b - a),
    [terms],
  );
  const semesters = useMemo(
    () =>
      [
        ...new Set(
          terms.filter((term) => term.academicYear === academicYear).map((term) => term.semester),
        ),
      ].sort((a, b) => a - b),
    [terms, academicYear],
  );

  const rosterQuery = useTeacherLinkRoster({
    schoolId: selectedSchoolId,
    schoolTermId: selectedTermId,
    search,
    sortBy: sort?.key as "name" | "linkStatus" | undefined,
    sortOrder: sort?.direction,
    page,
    limit: rowsPerPage,
  });
  const issueGrant = useIssueTeacherAccessGrant();
  const issueForTerm = useIssueTeacherAccessGrantsForTerm();
  const grantLink = useTeacherAccessGrantLink();
  const revokeGrant = useRevokeTeacherAccessGrant();
  const rotateGrant = useRotateTeacherAccessGrant();

  const entries = rosterQuery.data?.data ?? [];
  const meta = rosterQuery.data?.meta;
  const busyMembershipId = issueGrant.isPending
    ? String(issueGrant.variables?.teacherMembershipId ?? "")
    : null;

  async function createLink(entry: TeacherLinkRosterEntry): Promise<void> {
    if (!selectedTermId) return;
    const grant = await issueGrant.mutateAsync({
      teacherMembershipId: Number(entry.teacherMembershipId),
      schoolTermId: selectedTermId,
    });
    if (grant.accessUrl) setSharedUrl(grant.accessUrl);
  }

  async function copyLink(entry: TeacherLinkRosterEntry): Promise<void> {
    if (!entry.grantId) return;
    setSharedUrl(await grantLink.mutateAsync(entry.grantId));
  }

  async function rotateLink(entry: TeacherLinkRosterEntry): Promise<void> {
    if (!entry.grantId) return;
    const accepted = await confirm({
      title: `ออกลิงก์ใหม่ให้ ${entry.teacherDisplayName}?`,
      description: "ลิงก์เดิมจะใช้ไม่ได้ทันที ต้องส่งลิงก์ใหม่ให้ครูหลังดำเนินการ",
      confirmText: "ออกลิงก์ใหม่",
      variant: "destructive",
    });
    if (!accepted) return;
    const rotated = await rotateGrant.mutateAsync(entry.grantId);
    if (rotated.accessUrl) setSharedUrl(rotated.accessUrl);
  }

  async function issueForWholeTerm(): Promise<void> {
    if (!selectedTermId) return;
    const accepted = await confirm({
      title: "สร้างลิงก์เช็คชื่อให้ครูทั้งภาคเรียนนี้?",
      description:
        "ระบบจะสร้างลิงก์ให้ครูทุกคนที่ยังไม่มีลิงก์และมีห้องหรือรายวิชาในภาคเรียนนี้ ลิงก์เดิมของครูคนอื่นไม่ถูกเปลี่ยน",
      confirmText: "สร้างลิงก์",
    });
    if (!accepted) return;
    const result = await issueForTerm.mutateAsync(selectedTermId);
    setBulkResult({ issued: result.issued, skipped: result.skipped.length });
  }

  async function submitRevoke(): Promise<void> {
    if (!revokeTarget?.grantId || !revokeReason.trim()) return;
    await revokeGrant.mutateAsync({
      grantId: revokeTarget.grantId,
      reason: revokeReason.trim(),
    });
    setRevokeTarget(null);
    setRevokeReason("");
  }

  const pageError = schoolsQuery.error ?? termsQuery.error ?? rosterQuery.error;

  return (
    <PageShell>
      <PageToolbar
        actions={
          <Button
            disabled={!selectedTermId || issueForTerm.isPending}
            icon={Plus}
            isLoading={issueForTerm.isPending}
            loadingText="กำลังสร้างลิงก์"
            onClick={() => void issueForWholeTerm()}
          >
            สร้างลิงก์เช็คชื่อ
          </Button>
        }
        description="ออกลิงก์เช็คชื่อให้ครูรายคน อายุลิงก์เท่ากับหนึ่งภาคเรียน"
        icon={PAGE_ICON}
        title="จัดการลิงก์เช็คชื่อ"
      />
      <ToolbarControls className="mb-8">
        <SearchInput
          className="sm:max-w-[420px]"
          onChange={(value) => {
            setSearchInput(value);
            setPage(1);
          }}
          placeholder="ค้นหา"
          value={searchInput}
        />
        {multipleSchools ? (
          <FilterCombobox
            ariaLabel="กรองตามโรงเรียน"
            emptyText="ไม่พบโรงเรียน"
            onChange={(value) => {
              setSchoolInput(value);
              setAcademicYearInput("");
              setSemesterInput("");
              setPage(1);
            }}
            options={schools.map((school) => ({ value: String(school.id), label: school.name }))}
            placeholder="เลือกโรงเรียน"
            value={schoolId}
          />
        ) : null}
        <FilterCombobox
          ariaLabel="ปีการศึกษา"
          disabled={!selectedSchoolId || academicYears.length === 0}
          emptyText="ไม่พบปีการศึกษา"
          onChange={(value) => {
            setAcademicYearInput(value);
            setSemesterInput("");
            setPage(1);
          }}
          options={academicYears.map((year) => ({ value: String(year), label: String(year) }))}
          placeholder="ปีการศึกษา"
          value={academicYear ? String(academicYear) : ""}
        />
        <FilterCombobox
          ariaLabel="ภาคเรียน"
          disabled={!selectedSchoolId || semesters.length === 0}
          emptyText="ไม่พบภาคเรียน"
          onChange={(value) => {
            setSemesterInput(value);
            setPage(1);
          }}
          options={semesters.map((value) => ({
            value: String(value),
            label: `ภาคเรียนที่ ${value}`,
          }))}
          placeholder="ภาคเรียน"
          value={semester ? String(semester) : ""}
        />
      </ToolbarControls>

      <FormErrorAlert
        error={issueGrant.error ?? rotateGrant.error ?? grantLink.error}
        fallback="ดำเนินการกับลิงก์ไม่สำเร็จ กรุณาลองอีกครั้ง"
      />
      {bulkResult ? (
        <Alert className="mb-4" variant={bulkResult.issued > 0 ? "success" : "warning"}>
          <AlertTitle>สร้างลิงก์ {bulkResult.issued} รายการ</AlertTitle>
          <AlertDescription>
            {bulkResult.skipped > 0
              ? `ข้าม ${bulkResult.skipped} คนที่ยังไม่มีห้องหรือรายวิชาในภาคเรียนนี้`
              : "ครูทุกคนที่มีห้องหรือรายวิชาในภาคเรียนนี้มีลิงก์แล้ว"}
          </AlertDescription>
        </Alert>
      ) : null}

      {pageError ? (
        <ErrorState
          description="เกิดข้อผิดพลาดระหว่างโหลดรายชื่อครูและสถานะลิงก์"
          onRetry={() => {
            void schoolsQuery.refetch();
            void termsQuery.refetch();
            void rosterQuery.refetch();
          }}
          title="ไม่สามารถโหลดข้อมูลได้"
        />
      ) : schoolsQuery.isLoading || (selectedSchoolId && termsQuery.isLoading) ? (
        <SkeletonTable />
      ) : schools.length === 0 ? (
        <EmptyState
          description="บัญชีนี้ยังไม่มีโรงเรียนที่อยู่ในขอบเขตการดูแล"
          icon={PAGE_ICON}
          title="ไม่พบโรงเรียนในขอบเขต"
        />
      ) : multipleSchools && !selectedSchoolId ? (
        <EmptyState
          description="เลือกโรงเรียนจากตัวกรองด้านบนเพื่อแสดงรายชื่อครู"
          icon={PAGE_ICON}
          title="เลือกโรงเรียน"
        />
      ) : !selectedTermId ? (
        <EmptyState
          description="เพิ่มหรือเปิดใช้งานภาคเรียนในหน้าจัดการภาคเรียนและห้องเรียนก่อน"
          icon={PAGE_ICON}
          title="ยังไม่มีภาคเรียน"
        />
      ) : rosterQuery.isLoading ? (
        <SkeletonTable />
      ) : entries.length === 0 ? (
        <EmptyState
          description={
            search ? "ลองเปลี่ยนคำค้นหา" : "เพิ่มครูและกำหนดห้องหรือรายวิชาในภาคเรียนนี้ก่อน"
          }
          icon={PAGE_ICON}
          title={search ? "ไม่พบครูที่ค้นหา" : "ยังไม่มีครูในภาคเรียนนี้"}
        />
      ) : (
        <>
          <TeacherLinkTable
            busyMembershipId={busyMembershipId}
            entries={entries}
            onCopy={(entry) => void copyLink(entry)}
            onCreate={(entry) => void createLink(entry)}
            onRevoke={(entry) => {
              setRevokeTarget(entry);
              setRevokeReason("");
              revokeGrant.reset();
            }}
            onRotate={(entry) => void rotateLink(entry)}
            onSortChange={(nextSort) => {
              setSort(nextSort);
              setPage(1);
            }}
            sort={sort}
            startIndex={(page - 1) * rowsPerPage + 1}
          />
          <Pagination
            onPageChange={setPage}
            onRowsPerPageChange={(value) => {
              setRowsPerPage(value);
              setPage(1);
            }}
            page={page}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={PAGE_SIZE_OPTIONS}
            totalCount={meta?.totalCount ?? 0}
            unitLabel="คน"
          />
        </>
      )}

      <LinkShareDialog
        link={sharedUrl ?? ""}
        onOpenChange={(open) => {
          if (!open) setSharedUrl(null);
        }}
        open={Boolean(sharedUrl)}
      />

      <Dialog
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null);
        }}
        open={Boolean(revokeTarget)}
      >
        <DialogContent onClose={() => setRevokeTarget(null)}>
          <DialogHeader>
            <DialogTitle>เพิกถอนลิงก์ของ {revokeTarget?.teacherDisplayName}</DialogTitle>
            <DialogDescription>ครูจะเข้าใช้งานผ่านลิงก์นี้ไม่ได้ทันที</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <FormErrorAlert error={revokeGrant.error} fallback="ไม่สามารถเพิกถอนลิงก์ได้" />
            <div>
              <Label htmlFor="revoke-reason" required>
                เหตุผล
              </Label>
              <Textarea
                id="revoke-reason"
                onChange={(event) => setRevokeReason(event.target.value)}
                value={revokeReason}
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button onClick={() => setRevokeTarget(null)} variant="outline">
              ยกเลิก
            </Button>
            <Button
              disabled={!revokeReason.trim()}
              isLoading={revokeGrant.isPending}
              onClick={() => void submitRevoke()}
              variant="destructive"
            >
              เพิกถอนลิงก์
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </PageShell>
  );
}
