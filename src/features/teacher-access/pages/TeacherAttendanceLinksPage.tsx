import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Link2, MessageCircle, Pencil, Plus, Share2, ShieldOff, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  DateTimePicker,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormErrorAlert,
  IconButton,
  Label,
  NumericInput,
  Select,
  TimePicker,
  Textarea,
  useConfirm,
} from "../../../components/base";
import { LinkShareDialog } from "../../../components/layout/link-share-dialog";
import { useContextualNavigate } from "../../../components/layout/navigation-context";
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
import { usePermissions } from "../../auth/hooks/usePermissions";
import { useScopedSchools } from "../../school-structure/hooks/useSchoolStructure";
import { teacherLineService } from "../../teacher-line/api/teacher-line.service";
import { TeacherLinkTable } from "../components/TeacherLinkTable";
import { summarizeSkipReasons } from "../lib/teacher-link-presentation";
import {
  useIssueTeacherAccessGrant,
  useIssueTeacherLineInvitation,
  useIssueTeacherLineGroupInvitation,
  useRevokeTeacherLineGroupInvitation,
  useSendTeacherAccessGrantsOverLine,
  useIssueTeacherAccessGrantsForTerm,
  useRevokeTeacherAccessGrant,
  useRevokeTeacherLineInvitation,
  useRotateTeacherAccessGrant,
  useTeacherAccessGrantLink,
  useTeacherLinkRoster,
  useTeacherLineGroupInvitation,
  useUpdateTeacherLineGroupInvitation,
  useUnlinkTeacherLineAccount,
} from "../hooks/useTeacherAccess";
import type {
  BulkIssueTeacherAccessResult,
  SendTeacherAccessGrantsResult,
  TeacherLineFilter,
  TeacherLineGroupInvitationIssueResult,
  TeacherLinkRosterEntry,
} from "../types/teacher-access.types";
import type { DataTableSortState } from "../../../components/layout/data-table";

const PAGE_ICON = PAGE_IDENTITIES["/attendance-links"].icon;

function toLocalDateTimeValue(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

type LinkDurationUnit = "DAYS" | "WEEKS" | "MONTHS";

interface LineGroupScheduleDraft {
  duration: string;
  durationHours: string;
  durationMinutes: string;
  durationUnit: LinkDurationUnit;
  expiresAt: string;
  startsAt: string;
}

function addLinkDuration(
  start: Date,
  amount: number,
  unit: LinkDurationUnit,
  hours = 0,
  minutes = 0,
): Date {
  const result = new Date(start);
  if (unit === "DAYS") result.setTime(result.getTime() + amount * 86_400_000);
  else if (unit === "WEEKS") result.setTime(result.getTime() + amount * 7 * 86_400_000);
  else result.setMonth(result.getMonth() + amount);
  result.setTime(result.getTime() + hours * 3_600_000 + minutes * 60_000);
  return result;
}

function durationBetween(
  start: Date,
  end: Date,
  unit: LinkDurationUnit,
): { amount: number; hours: number; minutes: number } {
  const differenceMs = Math.max(0, end.getTime() - start.getTime());
  let amount: number;
  let remainderMs: number;
  if (unit === "MONTHS") {
    amount = 0;
    let cursor = new Date(start);
    while (amount < 12) {
      const next = addLinkDuration(start, amount + 1, "MONTHS");
      if (next > end) break;
      amount += 1;
      cursor = next;
    }
    remainderMs = end.getTime() - cursor.getTime();
  } else {
    const unitMs = unit === "DAYS" ? 86_400_000 : 7 * 86_400_000;
    amount = Math.floor(differenceMs / unitMs);
    remainderMs = differenceMs - amount * unitMs;
  }
  const hours = Math.floor(remainderMs / 3_600_000);
  const minutes = Math.floor((remainderMs % 3_600_000) / 60_000);
  return { amount, hours, minutes };
}

function inferDuration(
  start: Date,
  end: Date,
): { unit: LinkDurationUnit; amount: number; hours: number; minutes: number } {
  const monthDuration = durationBetween(start, end, "MONTHS");
  if (monthDuration.amount > 0 && monthDuration.hours < 24) {
    return { unit: "MONTHS", ...monthDuration };
  }
  const weekDuration = durationBetween(start, end, "WEEKS");
  if (weekDuration.amount > 0 && weekDuration.hours < 24) {
    return { unit: "WEEKS", ...weekDuration };
  }
  return { unit: "DAYS", ...durationBetween(start, end, "DAYS") };
}

function createInitialLineGroupSchedule(): LineGroupScheduleDraft {
  const startsAt = new Date();
  return {
    duration: "1",
    durationHours: "0",
    durationMinutes: "0",
    durationUnit: "WEEKS",
    expiresAt: toLocalDateTimeValue(addLinkDuration(startsAt, 1, "WEEKS")),
    startsAt: toLocalDateTimeValue(startsAt),
  };
}

export function TeacherAttendanceLinksPage() {
  const contextualNavigate = useContextualNavigate();
  const { can } = usePermissions();
  const canManageTeachers = can("manage-teachers");
  const schoolsQuery = useScopedSchools();
  const lineEnabledQuery = useQuery({
    queryKey: ["line-link", "status"],
    queryFn: teacherLineService.isEnabled,
  });
  const schools = useMemo(() => schoolsQuery.data ?? [], [schoolsQuery.data]);
  const [schoolInput, setSchoolInput] = useState("");
  const [academicYearInput, setAcademicYearInput] = useState("");
  const [semesterInput, setSemesterInput] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [lineStatusInput, setLineStatusInput] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState<DataTableSortState | undefined>();
  const [sharedUrl, setSharedUrl] = useState<string | null>(null);
  const [sharedLineGroup, setSharedLineGroup] =
    useState<TeacherLineGroupInvitationIssueResult | null>(null);
  const [lineGroupDialogOpen, setLineGroupDialogOpen] = useState(false);
  const [lineGroupDialogMode, setLineGroupDialogMode] = useState<"CREATE" | "EDIT">("CREATE");
  const [initialLineGroupSchedule] = useState(createInitialLineGroupSchedule);
  const [lineGroupStartsAt, setLineGroupStartsAt] = useState(
    initialLineGroupSchedule.startsAt,
  );
  const [lineGroupExpiresAt, setLineGroupExpiresAt] = useState(
    initialLineGroupSchedule.expiresAt,
  );
  const [lineGroupDuration, setLineGroupDuration] = useState(
    initialLineGroupSchedule.duration,
  );
  const [lineGroupDurationHours, setLineGroupDurationHours] = useState(
    initialLineGroupSchedule.durationHours,
  );
  const [lineGroupDurationMinutes, setLineGroupDurationMinutes] = useState(
    initialLineGroupSchedule.durationMinutes,
  );
  const [lineGroupDurationUnit, setLineGroupDurationUnit] =
    useState<LinkDurationUnit>(initialLineGroupSchedule.durationUnit);
  const [revokeTarget, setRevokeTarget] =
    useState<TeacherLinkRosterEntry | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [bulkResult, setBulkResult] =
    useState<BulkIssueTeacherAccessResult | null>(null);
  const [sendResult, setSendResult] =
    useState<SendTeacherAccessGrantsResult | null>(null);
  const lineDeliveryRequestRef = useRef<{
    signature: string;
    id: string;
  } | null>(null);
  const [selectedByMembershipId, setSelectedByMembershipId] = useState<
    Map<string, TeacherLinkRosterEntry>
  >(new Map());
  const { confirm, dialog: confirmDialog } = useConfirm();

  function resetLineGroupSchedule(): void {
    const schedule = createInitialLineGroupSchedule();
    setLineGroupStartsAt(schedule.startsAt);
    setLineGroupExpiresAt(schedule.expiresAt);
    setLineGroupDuration(schedule.duration);
    setLineGroupDurationHours(schedule.durationHours);
    setLineGroupDurationMinutes(schedule.durationMinutes);
    setLineGroupDurationUnit(schedule.durationUnit);
  }

  function openLineGroupDialog(): void {
    resetLineGroupSchedule();
    issueLineGroupInvitation.reset();
    setLineGroupDialogMode("CREATE");
    setLineGroupDialogOpen(true);
  }

  function openLineGroupEditDialog(): void {
    const invitation = lineGroupInvitation.data;
    if (!invitation) return;
    const startsAt = new Date(invitation.startsAt);
    const expiresAt = new Date(invitation.expiresAt);
    const duration = inferDuration(startsAt, expiresAt);
    setLineGroupStartsAt(toLocalDateTimeValue(startsAt));
    setLineGroupExpiresAt(toLocalDateTimeValue(expiresAt));
    setLineGroupDuration(String(duration.amount));
    setLineGroupDurationHours(String(duration.hours));
    setLineGroupDurationMinutes(String(duration.minutes));
    setLineGroupDurationUnit(duration.unit);
    updateLineGroupInvitation.reset();
    setLineGroupDialogMode("EDIT");
    setLineGroupDialogOpen(true);
  }
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
    () =>
      [...new Set(terms.map((term) => term.academicYear))].sort(
        (a, b) => b - a,
      ),
    [terms],
  );
  const semesters = useMemo(
    () =>
      [
        ...new Set(
          terms
            .filter((term) => term.academicYear === academicYear)
            .map((term) => term.semester),
        ),
      ].sort((a, b) => a - b),
    [terms, academicYear],
  );

  const rosterQuery = useTeacherLinkRoster({
    schoolId: selectedSchoolId,
    schoolTermId: selectedTermId,
    search,
    lineStatus: (lineStatusInput || undefined) as TeacherLineFilter | undefined,
    sortBy: sort?.key as "name" | "linkStatus" | undefined,
    sortOrder: sort?.direction,
    page,
    limit: rowsPerPage,
  });
  const issueGrant = useIssueTeacherAccessGrant();
  const issueForTerm = useIssueTeacherAccessGrantsForTerm();
  const sendOverLine = useSendTeacherAccessGrantsOverLine();
  const grantLink = useTeacherAccessGrantLink();
  const revokeGrant = useRevokeTeacherAccessGrant();
  const rotateGrant = useRotateTeacherAccessGrant();
  const unlinkLine = useUnlinkTeacherLineAccount();
  const issueLineInvitation = useIssueTeacherLineInvitation();
  const revokeLineInvitation = useRevokeTeacherLineInvitation();
  const lineGroupInvitation = useTeacherLineGroupInvitation(selectedSchoolId);
  const issueLineGroupInvitation = useIssueTeacherLineGroupInvitation();
  const updateLineGroupInvitation = useUpdateTeacherLineGroupInvitation();
  const revokeLineGroupInvitation = useRevokeTeacherLineGroupInvitation();

  const lineGroupStartTime = new Date(lineGroupStartsAt).getTime();
  const lineGroupExpiryTime = new Date(lineGroupExpiresAt).getTime();
  const lineGroupDurationAmount = Number(lineGroupDuration);
  const lineGroupAdditionalHours = Number(lineGroupDurationHours);
  const lineGroupAdditionalMinutes = Number(lineGroupDurationMinutes);
  const lineGroupScheduleIsValid =
    Number.isFinite(lineGroupStartTime) &&
    Number.isFinite(lineGroupExpiryTime) &&
    lineGroupExpiryTime > lineGroupStartTime &&
    Number.isInteger(lineGroupDurationAmount) &&
    lineGroupDurationAmount >= 0 &&
    Number.isInteger(lineGroupAdditionalHours) &&
    lineGroupAdditionalHours >= 0 &&
    lineGroupAdditionalHours <= 23 &&
    Number.isInteger(lineGroupAdditionalMinutes) &&
    lineGroupAdditionalMinutes >= 0 &&
    lineGroupAdditionalMinutes <= 59 &&
    lineGroupDurationAmount + lineGroupAdditionalHours + lineGroupAdditionalMinutes > 0;

  const entries = rosterQuery.data?.data ?? [];
  const meta = rosterQuery.data?.meta;
  const selectedEntries = useMemo(
    () => Array.from(selectedByMembershipId.values()),
    [selectedByMembershipId],
  );
  const selectedIds = useMemo(
    () => new Set(selectedByMembershipId.keys()),
    [selectedByMembershipId],
  );
  const busyMembershipId = issueGrant.isPending
    ? String(issueGrant.variables?.teacherMembershipId ?? "")
    : unlinkLine.isPending
      ? (unlinkLine.variables ?? null)
      : issueLineInvitation.isPending
        ? (issueLineInvitation.variables ?? null)
        : revokeLineInvitation.isPending
          ? (revokeLineInvitation.variables ?? null)
          : null;

  async function createLink(entry: TeacherLinkRosterEntry): Promise<void> {
    if (!selectedTermId) return;
    const grant = await issueGrant.mutateAsync({
      teacherMembershipId: Number(entry.teacherMembershipId),
      schoolTermId: selectedTermId,
    });
    setSharedLineGroup(null);
    if (grant.accessUrl) setSharedUrl(grant.accessUrl);
  }

  async function copyLink(entry: TeacherLinkRosterEntry): Promise<void> {
    if (!entry.grantId) return;
    setSharedLineGroup(null);
    setSharedUrl(await grantLink.mutateAsync(entry.grantId));
  }

  async function rotateLink(entry: TeacherLinkRosterEntry): Promise<void> {
    if (!entry.grantId) return;
    const accepted = await confirm({
      title: `ออกลิงก์ใหม่ให้ ${entry.teacherDisplayName}?`,
      description:
        "ลิงก์เดิมจะใช้ไม่ได้ทันที ต้องส่งลิงก์ใหม่ให้ครูหลังดำเนินการ",
      confirmText: "ออกลิงก์ใหม่",
      variant: "destructive",
    });
    if (!accepted) return;
    const rotated = await rotateGrant.mutateAsync(entry.grantId);
    setSharedLineGroup(null);
    if (rotated.accessUrl) setSharedUrl(rotated.accessUrl);
  }

  async function createLineGroupInvitation(): Promise<void> {
    if (!selectedSchoolId || lineGroupInvitation.data) return;
    const startsAt = new Date(lineGroupStartsAt);
    const duration = Number(lineGroupDuration);
    const durationHours = Number(lineGroupDurationHours);
    const durationMinutes = Number(lineGroupDurationMinutes);
    const expiresAt = new Date(lineGroupExpiresAt);
    if (
      !Number.isFinite(startsAt.getTime()) ||
      !Number.isFinite(expiresAt.getTime()) ||
      expiresAt <= startsAt ||
      !Number.isInteger(duration) || duration < 0 ||
      !Number.isInteger(durationHours) || durationHours < 0 || durationHours > 23 ||
      !Number.isInteger(durationMinutes) || durationMinutes < 0 || durationMinutes > 59 ||
      duration + durationHours + durationMinutes <= 0
    ) {
      return;
    }
    const result = await issueLineGroupInvitation.mutateAsync({
      schoolId: selectedSchoolId,
      startsAt: startsAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });
    setLineGroupDialogOpen(false);
    setSharedLineGroup(result);
    setSharedUrl(result.url);
  }

  async function updateActiveLineGroupInvitation(): Promise<void> {
    const invitation = lineGroupInvitation.data;
    if (!selectedSchoolId || !invitation) return;
    const startsAt = new Date(lineGroupStartsAt);
    const expiresAt = new Date(lineGroupExpiresAt);
    if (
      !Number.isFinite(startsAt.getTime()) ||
      !Number.isFinite(expiresAt.getTime()) ||
      expiresAt <= startsAt
    ) return;
    const result = await updateLineGroupInvitation.mutateAsync({
      invitationId: invitation.id,
      schoolId: selectedSchoolId,
      startsAt: startsAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });
    setLineGroupDialogOpen(false);
    setSharedLineGroup(result);
  }

  async function closeLineGroupInvitation(): Promise<void> {
    const active = lineGroupInvitation.data;
    if (!active) return;
    const accepted = await confirm({
      title: "ปิดลิงก์ยืนยัน LINE?",
      description: "ลิงก์ที่ส่งลงกลุ่มไว้จะใช้ขอ OTP ไม่ได้ทันที",
      confirmText: "ปิดลิงก์",
      variant: "destructive",
    });
    if (!accepted) return;
    if (!selectedSchoolId) return;
    await revokeLineGroupInvitation.mutateAsync({
      invitationId: active.id,
      schoolId: selectedSchoolId,
    });
    setSharedLineGroup(null);
    setSharedUrl(null);
  }

  async function unlinkLineAccount(
    entry: TeacherLinkRosterEntry,
  ): Promise<void> {
    const accepted = await confirm({
      title: `ปลดการเชื่อมต่อ LINE ของ ${entry.teacherDisplayName}?`,
      description:
        "บัญชี LINE เดิมจะไม่ได้รับลิงก์อีก และครูสามารถยืนยันบัญชี LINE ใหม่ได้ทันที",
      confirmText: "ปลดการเชื่อมต่อ",
      variant: "destructive",
    });
    if (!accepted) return;
    await unlinkLine.mutateAsync(entry.teacherMembershipId);
  }

  async function issueLineInvitationLink(
    entry: TeacherLinkRosterEntry,
  ): Promise<void> {
    const rotating = entry.lineInvitationStatus === "ACTIVE";
    const accepted = await confirm({
      title: `${rotating ? "ออกลิงก์ใหม่" : "ออกลิงก์ยืนยัน LINE"}ให้ ${entry.teacherDisplayName}?`,
      description: rotating
        ? "ลิงก์ยืนยันเดิมจะใช้ไม่ได้ทันที ลิงก์ใหม่มีอายุ 24 ชั่วโมงและใช้ได้ครั้งเดียว"
        : "ลิงก์มีอายุ 24 ชั่วโมง ใช้ได้ครั้งเดียว และครูต้องยืนยัน OTP ทางอีเมลก่อนเชื่อม LINE",
      confirmText: rotating ? "ออกลิงก์ใหม่" : "ออกลิงก์",
      variant: rotating ? "destructive" : "default",
    });
    if (!accepted) return;
    const invitation = await issueLineInvitation.mutateAsync(
      entry.teacherMembershipId,
    );
    setSharedUrl(invitation.url);
  }

  async function revokeLineInvitationLink(
    entry: TeacherLinkRosterEntry,
  ): Promise<void> {
    const accepted = await confirm({
      title: `ยกเลิกลิงก์ยืนยัน LINE ของ ${entry.teacherDisplayName}?`,
      description:
        "ลิงก์ที่ส่งไปแล้วจะใช้ไม่ได้ทันที แต่ไม่กระทบบัญชี LINE ที่เชื่อมสำเร็จแล้ว",
      confirmText: "ยกเลิกลิงก์",
      variant: "destructive",
    });
    if (!accepted) return;
    await revokeLineInvitation.mutateAsync(entry.teacherMembershipId);
  }

  /** With no rows ticked the button covers the whole term; with rows ticked, only those. */
  async function issueLinks(): Promise<void> {
    if (!selectedTermId) return;
    const picked = selectedEntries.length > 0;
    const accepted = await confirm({
      title: picked
        ? `สร้างลิงก์เช็คชื่อให้ครู ${selectedEntries.length} คนที่เลือก?`
        : "สร้างลิงก์เช็คชื่อให้ครูทั้งภาคเรียนนี้?",
      description: picked
        ? "ระบบจะสร้างลิงก์ให้เฉพาะครูที่เลือกซึ่งยังไม่มีลิงก์และมีห้องหรือรายวิชาในภาคเรียนนี้ ลิงก์เดิมไม่ถูกเปลี่ยน"
        : "ระบบจะสร้างลิงก์ให้ครูทุกคนที่ยังไม่มีลิงก์และมีห้องหรือรายวิชาในภาคเรียนนี้ ลิงก์เดิมของครูคนอื่นไม่ถูกเปลี่ยน",
      confirmText: "สร้างลิงก์",
    });
    if (!accepted) return;
    setSendResult(null);
    setBulkResult(
      await issueForTerm.mutateAsync({
        schoolTermId: selectedTermId,
        teacherMembershipIds: picked
          ? selectedEntries.map((entry) => Number(entry.teacherMembershipId))
          : undefined,
      }),
    );
    clearSelection();
  }

  /** Same picked/all rule as issuing, but only reaches teachers who verified LINE. */
  async function sendLinksOverLine(): Promise<void> {
    if (!selectedTermId) return;
    const picked = selectedEntries.length > 0;
    const accepted = await confirm({
      title: picked
        ? `ส่งลิงก์ทาง LINE ให้ครู ${selectedEntries.length} คนที่เลือก?`
        : "ส่งลิงก์ทาง LINE ให้ครูทั้งภาคเรียนนี้?",
      description:
        "ครูแต่ละคนจะได้รับลิงก์ของตัวเอง ระบบส่งได้เฉพาะคนที่ยืนยันบัญชี LINE และเพิ่มเพื่อนกับบัญชีทางการแล้ว",
      confirmText: "ส่งลิงก์",
    });
    if (!accepted) return;
    setBulkResult(null);
    const teacherMembershipIds = picked
      ? selectedEntries
          .map((entry) => Number(entry.teacherMembershipId))
          .sort((a, b) => a - b)
      : undefined;
    const signature = `${selectedTermId}:${teacherMembershipIds?.join(",") ?? "all"}`;
    if (lineDeliveryRequestRef.current?.signature !== signature) {
      lineDeliveryRequestRef.current = { signature, id: crypto.randomUUID() };
    }
    const result = await sendOverLine.mutateAsync({
      schoolTermId: selectedTermId,
      deliveryRequestId: lineDeliveryRequestRef.current.id,
      teacherMembershipIds,
    });
    lineDeliveryRequestRef.current = null;
    setSendResult(result);
    clearSelection();
  }

  function clearSelection(): void {
    setSelectedByMembershipId(new Map());
  }

  function selectRow(entry: TeacherLinkRosterEntry, selected: boolean): void {
    setSelectedByMembershipId((current) => {
      const next = new Map(current);
      if (selected) next.set(entry.teacherMembershipId, entry);
      else next.delete(entry.teacherMembershipId);
      return next;
    });
  }

  function selectRows(
    rows: readonly TeacherLinkRosterEntry[],
    selected: boolean,
  ): void {
    setSelectedByMembershipId((current) => {
      const next = new Map(current);
      for (const entry of rows) {
        if (selected) next.set(entry.teacherMembershipId, entry);
        else next.delete(entry.teacherMembershipId);
      }
      return next;
    });
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
          <>
            {lineEnabledQuery.data === true ? (
              <Button
                disabled={
                  !selectedSchoolId ||
                  lineGroupInvitation.isPending ||
                  lineGroupInvitation.isError ||
                  Boolean(lineGroupInvitation.data)
                }
                icon={Link2}
                onClick={openLineGroupDialog}
                title={
                  !selectedSchoolId
                    ? "กรุณาเลือกโรงเรียนก่อน"
                    : lineGroupInvitation.data
                      ? "โรงเรียนนี้มีลิงก์ที่ใช้งานอยู่แล้ว"
                      : undefined
                }
                variant="outline"
              >
                สร้างลิงก์ยืนยัน LINE
              </Button>
            ) : null}
            {lineEnabledQuery.data === true ? (
              <Button
                disabled={!selectedTermId || sendOverLine.isPending}
                icon={MessageCircle}
                isLoading={sendOverLine.isPending}
                loadingText="กำลังส่ง"
                onClick={() => void sendLinksOverLine()}
                variant="outline"
              >
                {selectedEntries.length > 0
                  ? `ส่งทาง LINE (${selectedEntries.length})`
                  : "ส่งลิงก์ทาง LINE"}
              </Button>
            ) : null}
            <Button
              disabled={!selectedTermId || issueForTerm.isPending}
              icon={Plus}
              isLoading={issueForTerm.isPending}
              loadingText="กำลังสร้างลิงก์"
              onClick={() => void issueLinks()}
            >
              {selectedEntries.length > 0
                ? `สร้างลิงก์ที่เลือก (${selectedEntries.length})`
                : "สร้างลิงก์เช็คชื่อ"}
            </Button>
          </>
        }
        description="ออกลิงก์เช็คชื่อให้ครูรายคน อายุลิงก์เท่ากับหนึ่งภาคเรียน"
        icon={PAGE_ICON}
        title="จัดการลิงก์เช็คชื่อ"
      />
      {lineGroupInvitation.data ? (
        <Alert className="mb-4" variant="success">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <AlertTitle>
                ลิงก์ยืนยัน LINE กลาง{
                  lineGroupInvitation.data.status === "PENDING" ? " (รอเวลาเริ่ม)" : " เปิดใช้งาน"
                }
              </AlertTitle>
              <AlertDescription>
                {lineGroupInvitation.data.schoolName} · {" "}
                เริ่ม {new Date(lineGroupInvitation.data.startsAt).toLocaleString("th-TH", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })} · หมดอายุ {new Date(lineGroupInvitation.data.expiresAt).toLocaleString("th-TH", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </AlertDescription>
            </div>
            <div className="flex items-center gap-2">
              <IconButton
                aria-label="แชร์ลิงก์ยืนยัน LINE"
                icon={Share2}
                onClick={() => {
                  const invitation = lineGroupInvitation.data;
                  if (!invitation) return;
                  setSharedLineGroup(invitation);
                  setSharedUrl(invitation.url);
                }}
                title="แชร์ลิงก์"
                variant="share"
              />
              <IconButton
                aria-label="แก้ไขวันเวลาลิงก์ยืนยัน LINE"
                icon={Pencil}
                onClick={openLineGroupEditDialog}
                title="แก้ไขวันเวลา"
                variant="edit"
              />
              <IconButton
                aria-label="ปิดลิงก์ยืนยัน LINE"
                disabled={revokeLineGroupInvitation.isPending}
                icon={ShieldOff}
                onClick={() => void closeLineGroupInvitation()}
                title="ปิดลิงก์"
                variant="lock"
              />
            </div>
          </div>
        </Alert>
      ) : null}
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
              clearSelection();
            }}
            options={schools.map((school) => ({
              value: String(school.id),
              label: school.name,
            }))}
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
            clearSelection();
          }}
          options={academicYears.map((year) => ({
            value: String(year),
            label: String(year),
          }))}
          placeholder="ปีการศึกษา"
          value={academicYear ? String(academicYear) : ""}
        />
        <FilterCombobox
          ariaLabel="สถานะ LINE"
          emptyText="ไม่พบสถานะ"
          onChange={(value) => {
            setLineStatusInput(value);
            setPage(1);
            clearSelection();
          }}
          options={[
            { value: "", label: "ทุกสถานะ LINE" },
            { value: "VERIFIED", label: "ยืนยัน LINE แล้ว" },
            { value: "NOT_VERIFIED", label: "ยังไม่ยืนยัน LINE" },
          ]}
          placeholder="สถานะ LINE"
          value={lineStatusInput}
        />
        <FilterCombobox
          ariaLabel="ภาคเรียน"
          disabled={!selectedSchoolId || semesters.length === 0}
          emptyText="ไม่พบภาคเรียน"
          onChange={(value) => {
            setSemesterInput(value);
            setPage(1);
            clearSelection();
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
        className="mb-4"
        error={
          issueGrant.error ??
          rotateGrant.error ??
          grantLink.error ??
          sendOverLine.error ??
          unlinkLine.error ??
          issueLineInvitation.error ??
          revokeLineInvitation.error
        }
        fallback="ดำเนินการกับลิงก์ไม่สำเร็จ กรุณาลองอีกครั้ง"
      />
      {bulkResult ? (
        <Alert
          className="mb-4"
          variant={bulkResult.issued > 0 ? "success" : "warning"}
        >
          <AlertTitle>สร้างลิงก์ {bulkResult.issued} รายการ</AlertTitle>
          <AlertDescription>
            {bulkResult.skipped.length === 0
              ? "ครูทุกคนที่มีห้องหรือรายวิชาในภาคเรียนนี้มีลิงก์แล้ว"
              : summarizeSkipReasons(bulkResult.skipped)}
          </AlertDescription>
        </Alert>
      ) : null}

      {sendResult ? (
        <Alert
          className="mb-4"
          variant={sendResult.sent > 0 ? "success" : "warning"}
        >
          <AlertTitle>ส่งลิงก์ทาง LINE สำเร็จ {sendResult.sent} คน</AlertTitle>
          <AlertDescription>
            {sendResult.skipped.length === 0
              ? "ส่งถึงครูทุกคนที่เลือกแล้ว"
              : summarizeSkipReasons(sendResult.skipped)}
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
      ) : schoolsQuery.isLoading ||
        (selectedSchoolId && termsQuery.isLoading) ? (
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
            search
              ? "ลองเปลี่ยนคำค้นหา"
              : "เพิ่มครูและกำหนดห้องหรือรายวิชาในภาคเรียนนี้ก่อน"
          }
          icon={PAGE_ICON}
          title={search ? "ไม่พบครูที่ค้นหา" : "ยังไม่มีครูในภาคเรียนนี้"}
        />
      ) : (
        <>
          {selectedEntries.length > 0 ? (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
              <p className="text-sm font-semibold text-slate-700">
                เลือกครู {selectedEntries.length} คน
              </p>
              <Button
                icon={X}
                onClick={clearSelection}
                size="sm"
                variant="outline"
              >
                ยกเลิกการเลือก
              </Button>
            </div>
          ) : null}
          <TeacherLinkTable
            busyMembershipId={busyMembershipId}
            entries={entries}
            onCopy={(entry) => void copyLink(entry)}
            onCreate={(entry) => void createLink(entry)}
            onIssueLineInvitation={(entry) =>
              void issueLineInvitationLink(entry)
            }
            onOpenProfile={
              canManageTeachers
                ? (entry) =>
                    contextualNavigate(`/manage-teachers/${entry.teacherId}/edit`)
                : undefined
            }
            onRevoke={(entry) => {
              setRevokeTarget(entry);
              setRevokeReason("");
              revokeGrant.reset();
            }}
            onRotate={(entry) => void rotateLink(entry)}
            onRevokeLineInvitation={(entry) =>
              void revokeLineInvitationLink(entry)
            }
            onUnlinkLine={(entry) => void unlinkLineAccount(entry)}
            onSelectAll={selectRows}
            onSelectRow={selectRow}
            onSortChange={(nextSort) => {
              setSort(nextSort);
              setPage(1);
            }}
            selectedIds={selectedIds}
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
        description={
          sharedLineGroup ? (
            <span>
              ใช้ได้ตั้งแต่ {new Date(sharedLineGroup.startsAt).toLocaleString("th-TH", {
                dateStyle: "medium",
                timeStyle: "short",
              })} · หมดอายุ {new Date(sharedLineGroup.expiresAt).toLocaleString("th-TH", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
          ) : undefined
        }
        link={sharedUrl ?? ""}
        onOpenChange={(open) => {
          if (!open) setSharedUrl(null);
        }}
        open={Boolean(sharedUrl)}
        title={sharedLineGroup ? "แชร์ลิงก์ยืนยัน LINE" : undefined}
      />

      <Dialog
        onOpenChange={(open) => {
          if (open) resetLineGroupSchedule();
          setLineGroupDialogOpen(open);
        }}
        open={lineGroupDialogOpen}
      >
        <DialogContent className="max-w-xl" onClose={() => setLineGroupDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle icon={CalendarClock}>
              {lineGroupDialogMode === "EDIT"
                ? "แก้ไขอายุลิงก์ยืนยัน LINE"
                : "กำหนดอายุลิงก์ยืนยัน LINE"}
            </DialogTitle>
            <DialogDescription>
              ลิงก์นี้ใช้สำหรับ {lineGroupInvitation.data?.schoolName ?? schools.find(
                (school) => school.id === selectedSchoolId,
              )?.name ?? "โรงเรียนที่เลือก"} โดยครูเลือกยืนยันผ่าน AraID หรือ OTP ทางอีเมลได้
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-5">
            <FormErrorAlert
              error={
                lineGroupDialogMode === "EDIT"
                  ? updateLineGroupInvitation.error
                  : issueLineGroupInvitation.error
              }
              fallback={
                lineGroupDialogMode === "EDIT"
                  ? "แก้ไขลิงก์ยืนยัน LINE ไม่สำเร็จ"
                  : "สร้างลิงก์ยืนยัน LINE ไม่สำเร็จ"
              }
            />
            <div>
              <Label required>วันและเวลาเริ่ม</Label>
              <DateTimePicker
                ariaLabel="วันและเวลาเริ่ม"
                onChange={(value) => {
                  setLineGroupStartsAt(value);
                  const start = new Date(value);
                  const duration = Number(lineGroupDuration);
                  if (Number.isFinite(start.getTime()) && duration >= 0) {
                    setLineGroupExpiresAt(
                      toLocalDateTimeValue(
                        addLinkDuration(
                          start,
                          duration,
                          lineGroupDurationUnit,
                          Number(lineGroupDurationHours),
                          Number(lineGroupDurationMinutes),
                        ),
                      ),
                    );
                  }
                }}
                value={lineGroupStartsAt}
              />
            </div>
            <div>
              <Label required>วันและเวลาหมดอายุ</Label>
              <DateTimePicker
                ariaLabel="วันและเวลาหมดอายุ"
                min={lineGroupStartsAt}
                onChange={(value) => {
                  setLineGroupExpiresAt(value);
                  const start = new Date(lineGroupStartsAt);
                  const end = new Date(value);
                  if (Number.isFinite(start.getTime()) && Number.isFinite(end.getTime())) {
                    const duration = inferDuration(start, end);
                    setLineGroupDurationUnit(duration.unit);
                    setLineGroupDuration(String(duration.amount));
                    setLineGroupDurationHours(String(duration.hours));
                    setLineGroupDurationMinutes(String(duration.minutes));
                  }
                }}
                value={lineGroupExpiresAt}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="line-group-duration" required>ระยะเวลา</Label>
                <NumericInput
                  id="line-group-duration"
                  min={0}
                  onChange={(event) => {
                    const value = event.target.value;
                    setLineGroupDuration(value);
                    const amount = Number(value);
                    const start = new Date(lineGroupStartsAt);
                    if (amount >= 0 && Number.isFinite(start.getTime())) {
                      setLineGroupExpiresAt(
                        toLocalDateTimeValue(
                          addLinkDuration(
                            start,
                            amount,
                            lineGroupDurationUnit,
                            Number(lineGroupDurationHours),
                            Number(lineGroupDurationMinutes),
                          ),
                        ),
                      );
                    }
                  }}
                  step="1"
                  value={lineGroupDuration}
                />
              </div>
              <div>
                <Label htmlFor="line-group-duration-unit" required>หน่วย</Label>
                <Select
                  id="line-group-duration-unit"
                  onChange={(event) => {
                    const unit = event.target.value as LinkDurationUnit;
                    setLineGroupDurationUnit(unit);
                    const start = new Date(lineGroupStartsAt);
                    if (Number.isFinite(start.getTime())) {
                      setLineGroupExpiresAt(
                        toLocalDateTimeValue(
                          addLinkDuration(
                            start,
                            Number(lineGroupDuration),
                            unit,
                            Number(lineGroupDurationHours),
                            Number(lineGroupDurationMinutes),
                          ),
                        ),
                      );
                    }
                  }}
                  value={lineGroupDurationUnit}
                >
                  <option value="DAYS">วัน</option>
                  <option value="WEEKS">สัปดาห์</option>
                  <option value="MONTHS">เดือน</option>
                </Select>
              </div>
            </div>
            <div>
              <div>
                <Label required>เวลาเพิ่มเติม (ชั่วโมง:นาที)</Label>
                <TimePicker
                  ariaLabel="ระยะเวลาเพิ่มเติม ชั่วโมงและนาที"
                  onChange={(value) => {
                    const [hours = "0", minutes = "0"] = value.split(":");
                    setLineGroupDurationHours(String(Number(hours)));
                    setLineGroupDurationMinutes(String(Number(minutes)));
                    const start = new Date(lineGroupStartsAt);
                    if (Number.isFinite(start.getTime())) {
                      setLineGroupExpiresAt(
                        toLocalDateTimeValue(
                          addLinkDuration(
                            start,
                            Number(lineGroupDuration),
                            lineGroupDurationUnit,
                            Number(hours),
                            Number(minutes),
                          ),
                        ),
                      );
                    }
                  }}
                  value={`${lineGroupDurationHours.padStart(2, "0")}:${lineGroupDurationMinutes.padStart(2, "0")}`}
                />
              </div>
            </div>
            {!lineGroupScheduleIsValid ? (
              <p className="text-sm text-danger" role="alert">
                วันหมดอายุต้องอยู่หลังวันเริ่ม และระยะเวลาต้องมากกว่า 0
              </p>
            ) : null}
          </DialogBody>
          <DialogFooter className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:grid sm:[&>button]:min-w-0 [&>button]:h-10 [&>button]:w-full">
            <Button onClick={() => setLineGroupDialogOpen(false)} variant="outline">
              ยกเลิก
            </Button>
            <Button
              disabled={!lineGroupScheduleIsValid}
              isLoading={
                lineGroupDialogMode === "EDIT"
                  ? updateLineGroupInvitation.isPending
                  : issueLineGroupInvitation.isPending
              }
              loadingText={lineGroupDialogMode === "EDIT" ? "กำลังบันทึก" : "กำลังสร้าง"}
              onClick={() => void (
                lineGroupDialogMode === "EDIT"
                  ? updateActiveLineGroupInvitation()
                  : createLineGroupInvitation()
              )}
            >
              {lineGroupDialogMode === "EDIT" ? "บันทึก" : "สร้างลิงก์"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null);
        }}
        open={Boolean(revokeTarget)}
      >
        <DialogContent onClose={() => setRevokeTarget(null)}>
          <DialogHeader>
            <DialogTitle>
              เพิกถอนลิงก์ของ {revokeTarget?.teacherDisplayName}
            </DialogTitle>
            <DialogDescription>
              ครูจะเข้าใช้งานผ่านลิงก์นี้ไม่ได้ทันที
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <FormErrorAlert
              error={revokeGrant.error}
              fallback="ไม่สามารถเพิกถอนลิงก์ได้"
            />
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
