import { useQuery } from "@tanstack/react-query";
import {
  CalendarClock,
  Link2,
  Link2Off,
  Pencil,
  Plus,
  Share2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  appToast,
  Button,
  DateTimePicker,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  Combobox,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormErrorAlert,
  IconButton,
  Label,
  Select,
  useConfirm,
} from "../../../components/base";
import { LinkShareDialog } from "../../../components/layout/link-share-dialog";
import { useContextualNavigate } from "../../../components/layout/navigation-context";
import { PAGE_IDENTITIES } from "../../../components/layout/page-identity";
import { Pagination } from "../../../components/layout/pagination";
import {
  EmptyState,
  ErrorState,
  FilterSelect,
  PageShell,
  PageToolbar,
  SearchInput,
  SkeletonTable,
  ToolbarControls,
} from "../../../components/layout/page-primitives";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { useRememberedState } from "../../../hooks/useRememberedState";
import {
  readPositiveIntegerSearchParam,
  useSyncedSearchParams,
} from "../../../hooks/useSyncedSearchParams";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../../lib/pagination";
import { formatThaiDateTime } from "../../../lib/date-time";
import { attendanceService } from "../../attendance/api/attendance.service";
import { useScopedSchools } from "../../school-structure/hooks/useSchoolStructure";
import { attendanceLookupService } from "../../tasks/api/attendance-lookup.service";
import { teacherLineService } from "../../teacher-line/api/teacher-line.service";
import { ClassroomLinksTable } from "../components/ClassroomLinksTable";
import {
  useBulkCreateClassroomLinks,
  useClassroomLineGroupInvitation,
  useClassroomLinks,
  useDeactivateClassroomLink,
  useIssueClassroomLineGroupInvitation,
  useRedisplayClassroomLink,
  useRevokeClassroomLineGroupInvitation,
  useResendClassroomLinkLine,
  useRotateClassroomLink,
  useUpdateClassroomLineGroupInvitation,
} from "../hooks/useClassroomLinks";
import type {
  ClassroomLinkListItem,
  ClassroomLinkStatus,
  ClassroomLineGroupInvitation,
} from "../types/classroom-links.types";
import {
  SCOPE_ALL_LABEL,
  SCOPE_REQUIRED_LABEL,
  formatSchoolArea,
} from "../../../lib/scope-presentation";
import { ScopeFilterField } from "../../attendance/components/ScopeFilterField";

const PAGE_ICON = PAGE_IDENTITIES["/attendance/classroom-links"].icon;

function toLocalDateTimeValue(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function initialLineGroupSchedule(): { startsAt: string; expiresAt: string } {
  const startsAt = new Date();
  const expiresAt = new Date(startsAt.getTime() + 7 * 86_400_000);
  return {
    startsAt: toLocalDateTimeValue(startsAt),
    expiresAt: toLocalDateTimeValue(expiresAt),
  };
}

export function ClassroomLinksPage() {
  const contextualNavigate = useContextualNavigate();
  const [searchParams] = useSearchParams();
  const schoolsQuery = useScopedSchools();
  const schools = useMemo(() => schoolsQuery.data ?? [], [schoolsQuery.data]);
  const [schoolInput, setSchoolInput] = useState(
    () => searchParams.get("schoolId") ?? "",
  );
  const [termInput, setTermInput] = useState(
    () => searchParams.get("termId") ?? "",
  );
  const [searchInput, setSearchInput] = useRememberedState(
    "classroom-links:search",
    "",
  );
  const search = useDebouncedValue(searchInput.trim());
  const [gradeInput, setGradeInput] = useState(
    () => searchParams.get("gradeId") ?? "",
  );
  const [linkStatusInput, setLinkStatusInput] = useState(() => {
    const value = searchParams.get("linkStatus") ?? "";
    return ["ACTIVE", "INACTIVE", "NOT_CREATED"].includes(value) ? value : "";
  });
  const [page, setPage] = useState(() =>
    readPositiveIntegerSearchParam(searchParams, "page", 1),
  );
  const [rowsPerPage, setRowsPerPage] = useState(() => {
    const value = readPositiveIntegerSearchParam(
      searchParams,
      "limit",
      DEFAULT_PAGE_SIZE,
    );
    return PAGE_SIZE_OPTIONS.includes(
      value as (typeof PAGE_SIZE_OPTIONS)[number],
    )
      ? value
      : DEFAULT_PAGE_SIZE;
  });
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [sharedUrl, setSharedUrl] = useState<string | null>(null);
  const [sharedLineInvitation, setSharedLineInvitation] =
    useState<ClassroomLineGroupInvitation | null>(null);
  const [lineDialogOpen, setLineDialogOpen] = useState(false);
  const [lineDialogMode, setLineDialogMode] = useState<"CREATE" | "EDIT">(
    "CREATE",
  );
  const [lineSchedule, setLineSchedule] = useState(initialLineGroupSchedule);
  const [pending, setPending] = useState<{
    action: string;
    id: string | number;
  } | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirm();

  const schoolId =
    Number(schools.length === 1 ? schools[0]?.id : schoolInput) || null;
  const termsQuery = useQuery({
    queryKey: ["classroom-links", "terms", schoolId],
    queryFn: () => attendanceService.getTerms(schoolId!),
    enabled: schoolId !== null,
  });
  const gradeLevelsQuery = useQuery({
    queryKey: ["classroom-links", "grade-levels"],
    queryFn: attendanceLookupService.getGradeLevels,
  });
  const lineEnabledQuery = useQuery({
    queryKey: ["line-link", "status"],
    queryFn: teacherLineService.isEnabled,
  });
  const terms = termsQuery.data ?? [];
  const selectedTerm =
    terms.find((term) => term.id === termInput) ??
    terms.find((term) => term.status === "ACTIVE") ??
    terms[0] ??
    null;
  const termId = selectedTerm ? Number(selectedTerm.id) : null;
  const linksQuery = useClassroomLinks(
    schoolId && termId
      ? {
          schoolId,
          schoolTermId: termId,
          search: search || undefined,
          gradeLevelId: Number(gradeInput) || undefined,
          linkStatus: (linkStatusInput || undefined) as
            | ClassroomLinkStatus
            | undefined,
          page,
          limit: rowsPerPage,
        }
      : null,
  );
  const bulkCreate = useBulkCreateClassroomLinks();
  const redisplay = useRedisplayClassroomLink();
  const rotate = useRotateClassroomLink();
  const deactivate = useDeactivateClassroomLink();
  const resendLine = useResendClassroomLinkLine();
  const lineInvitation = useClassroomLineGroupInvitation(schoolId);
  const issueLineInvitation = useIssueClassroomLineGroupInvitation();
  const updateLineInvitation = useUpdateClassroomLineGroupInvitation();
  const revokeLineInvitation = useRevokeClassroomLineGroupInvitation();
  const rows = linksQuery.data?.data ?? [];
  useSyncedSearchParams({
    schoolId: schools.length > 1 ? schoolInput || undefined : undefined,
    termId: termInput || undefined,
    gradeId: gradeInput || undefined,
    linkStatus: linkStatusInput || undefined,
    page: page > 1 ? page : undefined,
    limit: rowsPerPage !== DEFAULT_PAGE_SIZE ? rowsPerPage : undefined,
  });

  function resetListState(): void {
    setPage(1);
    setSelected(new Set());
  }

  async function createLinks(
    teacherMembershipIds?: number[],
    allTeachers = false,
  ): Promise<void> {
    if (!schoolId || !termId) return;
    const actionId = teacherMembershipIds?.[0] ?? "all";
    setPending({ action: "create", id: actionId });
    try {
      const result = await bulkCreate.mutateAsync({
        schoolId,
        schoolTermId: termId,
        teacherMembershipIds: allTeachers ? undefined : teacherMembershipIds,
        allTeachers: allTeachers || undefined,
      });
      const createdCount = result.data.filter((item) => item.created).length;
      const sentCount = result.data.filter(
        (item) => item.lineDelivery?.status === "SENT",
      ).length;
      appToast.success(
        `พร้อมใช้งาน ${result.data.length.toLocaleString("th-TH")} ห้อง${sentCount ? ` · ส่ง LINE สำเร็จ ${sentCount.toLocaleString("th-TH")} ห้อง` : ""}`,
      );
      if (
        createdCount === 1 &&
        result.data.length === 1 &&
        result.data[0].accessUrl
      ) {
        setSharedLineInvitation(null);
        setSharedUrl(result.data[0].accessUrl);
      }
      setSelected(new Set());
    } catch {
      // Mutation state is rendered by FormErrorAlert.
    } finally {
      setPending(null);
    }
  }

  async function handleCreateAll(): Promise<void> {
    const accepted = await confirm({
      title: "สร้างลิงก์ให้ครูทุกคนในภาคเรียนนี้?",
      description:
        "ลิงก์ที่ใช้งานอยู่จะไม่ถูกเปลี่ยน ส่วนห้องที่ยังไม่มีหรือถูกปิดจะได้รับลิงก์ใหม่และระบบจะลองส่งให้ครูประจำชั้นผ่าน LINE",
      confirmText: "สร้างทั้งหมด",
    });
    if (accepted) await createLinks(undefined, true);
  }

  async function handleCopy(row: ClassroomLinkListItem): Promise<void> {
    if (!row.id) return;
    setPending({ action: "copy", id: row.id });
    try {
      setSharedLineInvitation(null);
      setSharedUrl((await redisplay.mutateAsync(row.id)).accessUrl);
    } catch {
      // Mutation state is rendered by FormErrorAlert.
    } finally {
      setPending(null);
    }
  }

  async function handleRotate(row: ClassroomLinkListItem): Promise<void> {
    if (!row.id) return;
    const accepted = await confirm({
      title: `สร้างลิงก์ใหม่ให้ ${row.teacherName}?`,
      description:
        "ลิงก์เดิมจะหยุดใช้งานทันที หลังสร้างแล้วต้องส่งหรือแชร์ลิงก์ใหม่",
      confirmText: "สร้างลิงก์ใหม่",
      variant: "destructive",
    });
    if (!accepted) return;
    setPending({ action: "rotate", id: row.id });
    try {
      const result = await rotate.mutateAsync(row.id);
      setSharedLineInvitation(null);
      setSharedUrl(result.accessUrl);
      appToast.success("สร้างลิงก์ใหม่แล้ว กรุณาส่งลิงก์ใหม่ให้ผู้ใช้งาน");
    } catch {
      // Mutation state is rendered by FormErrorAlert.
    } finally {
      setPending(null);
    }
  }

  async function handleDeactivate(row: ClassroomLinkListItem): Promise<void> {
    if (!row.id) return;
    const accepted = await confirm({
      title: `ปิดลิงก์ของ ${row.teacherName}?`,
      description:
        "ผู้ที่มีลิงก์เดิมจะไม่สามารถเปิดห้องนี้ได้จนกว่าจะสร้างลิงก์ใหม่",
      confirmText: "ปิดลิงก์",
      variant: "destructive",
    });
    if (!accepted) return;
    setPending({ action: "deactivate", id: row.id });
    try {
      await deactivate.mutateAsync(row.id);
      appToast.success("ปิดลิงก์แล้ว");
    } catch {
      // Mutation state is rendered by FormErrorAlert.
    } finally {
      setPending(null);
    }
  }

  async function handleResendLine(row: ClassroomLinkListItem): Promise<void> {
    if (!row.id) return;
    setPending({ action: "line", id: row.id });
    try {
      const delivery = await resendLine.mutateAsync(row.id);
      if (delivery.status === "SENT")
        appToast.success("ส่งลิงก์ผ่าน LINE สำเร็จ");
      else
        appToast.error("ส่ง LINE ไม่สำเร็จ สามารถคัดลอกลิงก์เพื่อแชร์เองได้");
    } catch {
      // Mutation state is rendered by FormErrorAlert.
    } finally {
      setPending(null);
    }
  }

  function openCreateLineInvitation(): void {
    setLineDialogMode("CREATE");
    setLineSchedule(initialLineGroupSchedule());
    issueLineInvitation.reset();
    setLineDialogOpen(true);
  }

  function openEditLineInvitation(): void {
    const invitation = lineInvitation.data;
    if (!invitation) return;
    setLineDialogMode("EDIT");
    setLineSchedule({
      startsAt: toLocalDateTimeValue(new Date(invitation.startsAt)),
      expiresAt: toLocalDateTimeValue(new Date(invitation.expiresAt)),
    });
    updateLineInvitation.reset();
    setLineDialogOpen(true);
  }

  async function saveLineInvitation(): Promise<void> {
    if (!schoolId) return;
    const startsAt = new Date(lineSchedule.startsAt);
    const expiresAt = new Date(lineSchedule.expiresAt);
    if (
      !Number.isFinite(startsAt.getTime()) ||
      !Number.isFinite(expiresAt.getTime()) ||
      expiresAt <= startsAt
    ) {
      return;
    }
    const input = {
      schoolId,
      startsAt: startsAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
    const result =
      lineDialogMode === "EDIT" && lineInvitation.data
        ? await updateLineInvitation.mutateAsync({
            ...input,
            invitationId: lineInvitation.data.id,
          })
        : await issueLineInvitation.mutateAsync(input);
    setLineDialogOpen(false);
    setSharedLineInvitation(result);
    setSharedUrl(result.url);
  }

  async function closeLineInvitation(): Promise<void> {
    const invitation = lineInvitation.data;
    if (!schoolId || !invitation) return;
    const accepted = await confirm({
      title: "ปิดลิงก์ยืนยัน LINE?",
      description:
        "ครูจะใช้ลิงก์กลางนี้ยืนยันบัญชี LINE ไม่ได้ทันที ลิงก์ครูที่สร้างไว้ไม่ถูกลบ",
      confirmText: "ปิดลิงก์",
      variant: "destructive",
    });
    if (!accepted) return;
    await revokeLineInvitation.mutateAsync({
      invitationId: invitation.id,
      schoolId,
    });
    setSharedLineInvitation(null);
    setSharedUrl(null);
  }

  const actionError =
    bulkCreate.error ??
    redisplay.error ??
    rotate.error ??
    deactivate.error ??
    resendLine.error ??
    lineInvitation.error ??
    issueLineInvitation.error ??
    updateLineInvitation.error ??
    revokeLineInvitation.error;
  const pageError =
    schoolsQuery.error ??
    termsQuery.error ??
    gradeLevelsQuery.error ??
    linksQuery.error;
  const isLoading =
    schoolsQuery.isLoading ||
    gradeLevelsQuery.isLoading ||
    Boolean(schoolId && termsQuery.isLoading) ||
    Boolean(schoolId && termId && linksQuery.isLoading);

  return (
    <PageShell>
      <PageToolbar
        actions={
          <div className="flex flex-wrap justify-end gap-2">
            {lineEnabledQuery.data === true ? (
              <Button
                disabled={
                  !schoolId ||
                  lineInvitation.isPending ||
                  Boolean(lineInvitation.data)
                }
                icon={Link2}
                onClick={openCreateLineInvitation}
                variant="outline"
              >
                สร้างลิงก์ยืนยัน LINE
              </Button>
            ) : null}
            <Button
              disabled={selected.size === 0}
              icon={Plus}
              isLoading={bulkCreate.isPending && pending?.id !== "all"}
              onClick={() => void createLinks([...selected])}
              variant="outline"
            >
              สร้างที่เลือก ({selected.size.toLocaleString("th-TH")})
            </Button>
            <Button
              disabled={!schoolId || !termId}
              icon={Link2}
              isLoading={bulkCreate.isPending && pending?.id === "all"}
              onClick={() => void handleCreateAll()}
            >
              สร้างทั้งหมด
            </Button>
          </div>
        }
        scope={
          <ScopeFilterField
            editable={schools.length > 1}
            scope={{
              schoolName: schools.find(
                (school) => String(school.id) === schoolInput,
              )?.name,
              grade: (gradeLevelsQuery.data ?? []).find(
                (grade) => String(grade.id) === gradeInput,
              )?.label,
            }}
          >
            <Combobox
              ariaLabel="เลือกโรงเรียน"
              emptyText="ไม่พบโรงเรียน"
              onChange={(value) => {
                setSchoolInput(value);
                setTermInput("");
                resetListState();
              }}
              options={schools.map((school) => ({
                value: String(school.id),
                label: school.name,
                description: formatSchoolArea(school),
              }))}
              placeholder={SCOPE_REQUIRED_LABEL.school}
              value={schoolInput}
            />
            <Select
              aria-label="กรองระดับชั้น"
              onChange={(event) => {
                setGradeInput(event.target.value);
                resetListState();
              }}
              value={gradeInput}
            >
              <option value="">{SCOPE_ALL_LABEL.grade}</option>
              {(gradeLevelsQuery.data ?? []).map((grade) => (
                <option key={grade.id} value={String(grade.id)}>
                  {grade.label}
                </option>
              ))}
            </Select>
          </ScopeFilterField>
        }
        title="จัดการลิงก์ครู"
      >
        <ToolbarControls>
          <SearchInput
            className="sm:max-w-[420px]"
            onChange={(value) => {
              setSearchInput(value);
              resetListState();
            }}
            placeholder="ค้นหาห้อง ระดับชั้น หรือครูประจำชั้น"
            value={searchInput}
          />
          <FilterSelect
            ariaLabel="เลือกภาคเรียน"
            disabled={!schoolId || terms.length === 0}
            onChange={(value) => {
              setTermInput(value);
              resetListState();
            }}
            value={selectedTerm?.id ?? ""}
          >
            {terms.length === 0 ? (
              <option value="">ยังไม่มีภาคเรียน</option>
            ) : null}
            {terms.map((term) => (
              <option key={term.id} value={term.id}>
                ปีการศึกษา {term.academicYear}/{term.semester}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            ariaLabel="กรองสถานะลิงก์"
            onChange={(value) => {
              setLinkStatusInput(value);
              resetListState();
            }}
            value={linkStatusInput}
          >
            <option value="">ทุกสถานะลิงก์</option>
            <option value="ACTIVE">ใช้งานอยู่</option>
            <option value="INACTIVE">ปิดใช้งาน</option>
            <option value="NOT_CREATED">ยังไม่ได้สร้าง</option>
          </FilterSelect>
        </ToolbarControls>
      </PageToolbar>

      {lineInvitation.data ? (
        <section className="mb-4 rounded-lg border border-success/25 bg-success-50 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                ลิงก์ยืนยัน LINE กลาง
                {lineInvitation.data.status === "PENDING"
                  ? " (รอเวลาเริ่ม)"
                  : " เปิดใช้งาน"}
              </h2>
              <p className="mt-0.5 text-sm text-slate-600">
                ใช้ได้เฉพาะครูประจำชั้นของ {lineInvitation.data.schoolName} ·
                เริ่ม {formatThaiDateTime(lineInvitation.data.startsAt)} ·
                หมดอายุ {formatThaiDateTime(lineInvitation.data.expiresAt)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <IconButton
                aria-label="แก้ไขวันเวลาลิงก์ยืนยัน LINE"
                icon={Pencil}
                onClick={openEditLineInvitation}
                title="แก้ไขวันเวลา"
                variant="edit"
              />
              <IconButton
                aria-label="แชร์ลิงก์ยืนยัน LINE"
                icon={Share2}
                onClick={() => {
                  if (!lineInvitation.data) return;
                  setSharedLineInvitation(lineInvitation.data);
                  setSharedUrl(lineInvitation.data.url);
                }}
                title="แชร์ลิงก์"
                variant="share"
              />
              <IconButton
                aria-label="ปิดลิงก์ยืนยัน LINE"
                disabled={revokeLineInvitation.isPending}
                icon={Link2Off}
                onClick={() => void closeLineInvitation()}
                title="ปิดลิงก์"
                variant="lock"
              />
            </div>
          </div>
        </section>
      ) : null}

      <FormErrorAlert
        className="mb-4"
        error={actionError}
        fallback="ดำเนินการกับลิงก์ไม่สำเร็จ"
      />

      {/* One page, one question: which teacher holds a link. An assignment is
          not a teacher's standing key and is managed where it is created — on
          the check-in screen for the lesson it covers. */}
      {pageError ? (
        <ErrorState
          description="ไม่สามารถโหลดข้อมูลลิงก์ครูได้ กรุณาลองใหม่อีกครั้ง"
          onRetry={() => {
            void schoolsQuery.refetch();
            void termsQuery.refetch();
            void gradeLevelsQuery.refetch();
            void linksQuery.refetch();
          }}
          title="โหลดข้อมูลไม่สำเร็จ"
        />
      ) : isLoading ? (
        <SkeletonTable rows={8} />
      ) : schools.length === 0 ? (
        <EmptyState
          description="บัญชีนี้ยังไม่มีโรงเรียนในขอบเขตการดูแล"
          icon={PAGE_ICON}
          title="ไม่พบโรงเรียนในขอบเขต"
        />
      ) : schools.length > 1 && !schoolId ? (
        <EmptyState
          description="เลือกโรงเรียนจากตัวกรองด้านบน"
          icon={PAGE_ICON}
          title="เลือกโรงเรียน"
        />
      ) : !selectedTerm ? (
        <EmptyState
          description="เพิ่มภาคเรียนในหน้าจัดการภาคเรียนและห้องเรียนก่อน"
          icon={PAGE_ICON}
          title="ยังไม่มีภาคเรียน"
        />
      ) : rows.length === 0 ? (
        <EmptyState
          description={
            search || gradeInput || linkStatusInput
              ? "ลองเปลี่ยนคำค้นหาหรือตัวกรอง"
              : "ยังไม่มีห้องเรียนในภาคเรียนนี้"
          }
          icon={PAGE_ICON}
          title="ไม่พบห้องเรียน"
        />
      ) : (
        <>
          <ClassroomLinksTable
            onCopy={(row) => void handleCopy(row)}
            onCreate={(row) =>
              row.teacherMembershipId === null
                ? undefined
                : void createLinks([row.teacherMembershipId])
            }
            onDeactivate={(row) => void handleDeactivate(row)}
            onOpenTeacher={(teacherId) =>
              contextualNavigate(`/teachers/${teacherId}`)
            }
            onResendLine={(row) => void handleResendLine(row)}
            onRotate={(row) => void handleRotate(row)}
            onSelectionChange={setSelected}
            pending={pending}
            rows={rows}
            selected={selected}
          />
          <Pagination
            onPageChange={(value) => {
              setPage(value);
              setSelected(new Set());
            }}
            onRowsPerPageChange={(value) => {
              setRowsPerPage(value);
              setPage(1);
              setSelected(new Set());
            }}
            page={page}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={PAGE_SIZE_OPTIONS}
            totalCount={linksQuery.data?.meta.total ?? 0}
            unitLabel="ห้อง"
          />
        </>
      )}

      <LinkShareDialog
        description={
          sharedLineInvitation
            ? `ใช้ได้เฉพาะครูประจำชั้น · เริ่ม ${formatThaiDateTime(sharedLineInvitation.startsAt)} · หมดอายุ ${formatThaiDateTime(sharedLineInvitation.expiresAt)}`
            : "ลิงก์นี้เปิดได้เฉพาะห้องเรียนที่กำหนด ครูที่มีสถานะใช้งานในโรงเรียนต้องยืนยันตัวตนก่อนเช็กชื่อ"
        }
        link={sharedUrl ?? ""}
        onOpenChange={(open) => {
          if (!open) {
            setSharedUrl(null);
            setSharedLineInvitation(null);
          }
        }}
        open={Boolean(sharedUrl)}
        title={
          sharedLineInvitation
            ? "แชร์ลิงก์ยืนยัน LINE"
            : "คัดลอกหรือแชร์ลิงก์ครู"
        }
      />
      <Dialog onOpenChange={setLineDialogOpen} open={lineDialogOpen}>
        <DialogContent
          className="max-w-xl"
          onClose={() => setLineDialogOpen(false)}
        >
          <DialogHeader>
            <DialogTitle icon={CalendarClock}>
              {lineDialogMode === "EDIT"
                ? "แก้ไขอายุลิงก์ยืนยัน LINE"
                : "กำหนดอายุลิงก์ยืนยัน LINE"}
            </DialogTitle>
            <DialogDescription>
              ลิงก์นี้ใช้ได้เฉพาะครูประจำชั้นที่มีสถานะใช้งานในโรงเรียนที่เลือก
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-5">
            <FormErrorAlert
              error={
                lineDialogMode === "EDIT"
                  ? updateLineInvitation.error
                  : issueLineInvitation.error
              }
              fallback="บันทึกลิงก์ยืนยัน LINE ไม่สำเร็จ"
            />
            <div>
              <Label required>วันและเวลาเริ่ม</Label>
              <DateTimePicker
                ariaLabel="วันและเวลาเริ่ม"
                onChange={(startsAt) =>
                  setLineSchedule((current) => ({ ...current, startsAt }))
                }
                value={lineSchedule.startsAt}
              />
            </div>
            <div>
              <Label required>วันและเวลาหมดอายุ</Label>
              <DateTimePicker
                ariaLabel="วันและเวลาหมดอายุ"
                min={lineSchedule.startsAt}
                onChange={(expiresAt) =>
                  setLineSchedule((current) => ({ ...current, expiresAt }))
                }
                value={lineSchedule.expiresAt}
              />
            </div>
            {new Date(lineSchedule.expiresAt) <=
            new Date(lineSchedule.startsAt) ? (
              <p className="text-sm text-danger" role="alert">
                วันหมดอายุต้องอยู่หลังวันเริ่ม
              </p>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button onClick={() => setLineDialogOpen(false)} variant="outline">
              ยกเลิก
            </Button>
            <Button
              disabled={
                new Date(lineSchedule.expiresAt) <=
                new Date(lineSchedule.startsAt)
              }
              isLoading={
                lineDialogMode === "EDIT"
                  ? updateLineInvitation.isPending
                  : issueLineInvitation.isPending
              }
              onClick={() => void saveLineInvitation()}
            >
              {lineDialogMode === "EDIT" ? "บันทึก" : "สร้างลิงก์"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </PageShell>
  );
}
