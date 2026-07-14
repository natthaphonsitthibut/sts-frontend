import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardCopy,
  KeyRound,
  Link2,
  Plus,
  RefreshCw,
  Share2,
  ShieldOff,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormErrorAlert,
  FormMessage,
  Input,
  Label,
  Select,
  Textarea,
  useConfirm,
} from "../../../components/base";
import {
  EmptyState,
  ErrorState,
  PageShell,
  PageToolbar,
  SkeletonStack,
  ToolbarFilterGrid,
} from "../../../components/layout/page-primitives";
import { Pagination } from "../../../components/layout/pagination";
import { attendanceService } from "../../attendance/api/attendance.service";
import { useSchoolTeachers, useScopedSchools } from "../../school-structure/hooks/useSchoolStructure";
import {
  useIssueTeacherAccessGrant,
  useRevokeTeacherAccessGrant,
  useRotateTeacherAccessGrant,
  useTeacherAccessGrants,
  useTeacherAssignmentOptions,
} from "../hooks/useTeacherAccess";
import type {
  TeacherAccessCapability,
  TeacherAccessGrant,
  TeacherAccessGrantStatus,
} from "../types/teacher-access.types";

const issueSchema = z.object({
  teacherMembershipId: z.string().min(1, "กรุณาเลือกครู"),
  capabilities: z.array(z.enum(["HOMEROOM_ATTENDANCE", "TEACHER_OBSERVATION"]))
    .min(1, "เลือกสิทธิ์อย่างน้อย 1 รายการ"),
  assignmentIds: z.array(z.string()).min(1, "เลือกห้องหรือวิชาอย่างน้อย 1 รายการ"),
  expiresAt: z.string(),
});

type IssueFormValues = z.infer<typeof issueSchema>;

const CAPABILITY_LABELS: Record<TeacherAccessCapability, string> = {
  HOMEROOM_ATTENDANCE: "เช็คชื่อห้องประจำชั้น",
  TEACHER_OBSERVATION: "บันทึกข้อสังเกตครู",
};

const TERM_STATUS_LABELS = {
  ACTIVE: "ใช้งานอยู่",
  DRAFT: "ฉบับร่าง",
  CLOSED: "ปิดแล้ว",
} as const;

const STATUS_META: Record<
  TeacherAccessGrantStatus,
  { label: string; variant: "success" | "destructive" | "warning" | "secondary" }
> = {
  ACTIVE: { label: "ใช้งานอยู่", variant: "success" },
  REVOKED: { label: "เพิกถอนแล้ว", variant: "destructive" },
  EXPIRED: { label: "หมดอายุ", variant: "warning" },
  SUSPENDED: { label: "ระงับชั่วคราว", variant: "secondary" },
};

const dateTimeFormatter = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDateTime(value: string | null): string {
  return value ? dateTimeFormatter.format(new Date(value)) : "ยังไม่เคยใช้งาน";
}

function assignmentLabel(assignment: {
  gradeLabel: string;
  roomCode: string;
  roomName: string | null;
  subjectName: string | null;
}): string {
  const room = `${assignment.gradeLabel} / ${assignment.roomName || assignment.roomCode}`;
  return assignment.subjectName ? `${room} · ${assignment.subjectName}` : room;
}

export function TeacherAccessGrantsPage() {
  const [schoolInput, setSchoolInput] = useState("");
  const [termInput, setTermInput] = useState("");
  const [statusInput, setStatusInput] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [issueOpen, setIssueOpen] = useState(false);
  const [oneTimeUrl, setOneTimeUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [shared, setShared] = useState(false);
  const [shareFailed, setShareFailed] = useState(false);
  const [revokeGrant, setRevokeGrant] = useState<TeacherAccessGrant | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const { confirm, dialog: confirmDialog } = useConfirm();

  const schoolsQuery = useScopedSchools();
  const schools = schoolsQuery.data ?? [];
  const selectedSchoolId = Number(schoolInput || schools[0]?.id || 0) || undefined;
  const termsQuery = useQuery({
    queryKey: ["teacher-access", "terms", selectedSchoolId],
    queryFn: () => attendanceService.getTerms(selectedSchoolId!),
    enabled: Boolean(selectedSchoolId),
  });
  const terms = termsQuery.data ?? [];
  const defaultTerm = terms.find((term) => term.status === "ACTIVE") ?? terms[0];
  const selectedTermId = Number(termInput || defaultTerm?.id || 0) || undefined;
  const selectedTerm = terms.find((term) => Number(term.id) === selectedTermId);
  const teachersQuery = useSchoolTeachers(selectedSchoolId);
  const activeTeachers = (teachersQuery.data ?? []).filter(
    (teacher) => teacher.membershipStatus === "ACTIVE",
  );
  const grantsQuery = useTeacherAccessGrants({
    schoolId: selectedSchoolId,
    schoolTermId: selectedTermId,
    status: (statusInput || undefined) as TeacherAccessGrantStatus | undefined,
    page,
    limit,
  });
  const issueGrant = useIssueTeacherAccessGrant();
  const revokeAccess = useRevokeTeacherAccessGrant();
  const rotateAccess = useRotateTeacherAccessGrant();

  const issueForm = useForm<IssueFormValues>({
    resolver: zodResolver(issueSchema),
    defaultValues: {
      teacherMembershipId: "",
      capabilities: [],
      assignmentIds: [],
      expiresAt: "",
    },
  });
  const [teacherMembershipValue, selectedCapabilities, selectedAssignmentIds] = useWatch({
    control: issueForm.control,
    name: ["teacherMembershipId", "capabilities", "assignmentIds"],
  });
  const teacherMembershipId = Number(teacherMembershipValue) || undefined;
  const assignmentOptionsQuery = useTeacherAssignmentOptions({
    schoolId: selectedSchoolId,
    schoolTermId: selectedTermId,
    teacherMembershipId,
  });
  const assignmentOptions = useMemo(
    () => assignmentOptionsQuery.data ?? [],
    [assignmentOptionsQuery.data],
  );
  const visibleAssignments = useMemo(
    () => assignmentOptions.filter((assignment) =>
      selectedCapabilities.length === 0 ||
      assignment.allowedActions.some((capability) => selectedCapabilities.includes(capability))),
    [assignmentOptions, selectedCapabilities],
  );

  function closeIssueDialog(): void {
    setIssueOpen(false);
    issueForm.reset();
    issueGrant.reset();
  }

  async function submitIssue(values: IssueFormValues): Promise<void> {
    if (!selectedTermId || selectedTerm?.status !== "ACTIVE" || !selectedTerm.endsOn) return;
    const selectedAssignments = assignmentOptions.filter((assignment) =>
      values.assignmentIds.includes(assignment.id),
    );
    const missingCapabilityAssignment = values.capabilities.find((capability) =>
      !selectedAssignments.some((assignment) => assignment.allowedActions.includes(capability)),
    );
    if (missingCapabilityAssignment) {
      issueForm.setError("assignmentIds", {
        message: `กรุณาเลือกงานสอนสำหรับ “${CAPABILITY_LABELS[missingCapabilityAssignment]}”`,
      });
      return;
    }
    const grant = await issueGrant.mutateAsync({
      teacherMembershipId: Number(values.teacherMembershipId),
      schoolTermId: selectedTermId,
      capabilities: values.capabilities,
      assignmentIds: values.assignmentIds.map(Number),
      expiresAt: values.expiresAt ? new Date(values.expiresAt).toISOString() : undefined,
    });
    closeIssueDialog();
    if (grant.accessUrl) setOneTimeUrl(grant.accessUrl);
  }

  async function submitRevoke(): Promise<void> {
    if (!revokeGrant || !revokeReason.trim()) return;
    await revokeAccess.mutateAsync({ grantId: revokeGrant.id, reason: revokeReason.trim() });
    setRevokeGrant(null);
    setRevokeReason("");
  }

  async function rotate(grant: TeacherAccessGrant): Promise<void> {
    const accepted = await confirm({
      title: "ออกลิงก์ใหม่แทนลิงก์เดิม?",
      description: "ลิงก์เดิมจะใช้ไม่ได้ทันที โปรดส่งลิงก์ใหม่ให้ครูหลังดำเนินการ",
      confirmText: "ออกลิงก์ใหม่",
      variant: "destructive",
    });
    if (!accepted) return;
    const rotated = await rotateAccess.mutateAsync(grant.id);
    rotateAccess.reset();
    if (rotated.accessUrl) setOneTimeUrl(rotated.accessUrl);
  }

  async function copyOneTimeUrl(): Promise<void> {
    if (!oneTimeUrl) return;
    try {
      if (!navigator.clipboard) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(oneTimeUrl);
      setCopied(true);
      setCopyFailed(false);
    } catch {
      setCopied(false);
      setCopyFailed(true);
    }
  }

  async function shareOneTimeUrl(): Promise<void> {
    if (!oneTimeUrl || typeof navigator.share !== "function") return;
    try {
      await navigator.share({
        title: "ลิงก์เข้าใช้งานครู",
        url: oneTimeUrl,
      });
      setShared(true);
      setShareFailed(false);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShared(false);
      setShareFailed(true);
    }
  }

  if (schoolsQuery.isLoading) {
    return <PageShell><SkeletonStack lines={6} /></PageShell>;
  }
  if (schoolsQuery.isError) {
    return (
      <PageShell>
        <ErrorState
          title="โหลดโรงเรียนไม่สำเร็จ"
          description="ไม่สามารถโหลดโรงเรียนในขอบเขตของคุณได้"
          onRetry={() => void schoolsQuery.refetch()}
        />
      </PageShell>
    );
  }

  const grants = grantsQuery.data?.data ?? [];
  const meta = grantsQuery.data?.meta;
  const canNativeShare = typeof navigator.share === "function";

  function clearOneTimeUrl(): void {
    setOneTimeUrl(null);
    setCopied(false);
    setCopyFailed(false);
    setShared(false);
    setShareFailed(false);
  }

  return (
    <PageShell>
      <PageToolbar
        icon={KeyRound}
        title="ลิงก์เข้าใช้งานครู"
        description="ออกลิงก์ตามภาคเรียน ห้อง และความสามารถที่ครูได้รับมอบหมาย"
        actions={
          <Button
            icon={Plus}
            disabled={
              !selectedSchoolId ||
              !selectedTermId ||
              selectedTerm?.status !== "ACTIVE" ||
              !selectedTerm.endsOn ||
              activeTeachers.length === 0
            }
            onClick={() => setIssueOpen(true)}
          >
            ออกลิงก์ใหม่
          </Button>
        }
      >
        <ToolbarFilterGrid className="lg:grid-cols-3">
          <div>
            <Label htmlFor="teacher-access-school">โรงเรียน</Label>
            <Select
              id="teacher-access-school"
              value={String(selectedSchoolId ?? "")}
              onChange={(event) => {
                setSchoolInput(event.target.value);
                setTermInput("");
                setPage(1);
              }}
            >
              {schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="teacher-access-term">ภาคเรียน</Label>
            <Select
              id="teacher-access-term"
              value={String(selectedTermId ?? "")}
              onChange={(event) => {
                setTermInput(event.target.value);
                setPage(1);
              }}
              disabled={termsQuery.isLoading || terms.length === 0}
            >
              {terms.map((term) => (
                <option key={term.id} value={term.id}>
                  ปี {term.academicYear} ภาค {term.semester} · {TERM_STATUS_LABELS[term.status]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="teacher-access-status">สถานะ</Label>
            <Select
              id="teacher-access-status"
              value={statusInput}
              onChange={(event) => { setStatusInput(event.target.value); setPage(1); }}
            >
              <option value="">ทุกสถานะ</option>
              {Object.entries(STATUS_META).map(([value, item]) => (
                <option key={value} value={value}>{item.label}</option>
              ))}
            </Select>
          </div>
        </ToolbarFilterGrid>
      </PageToolbar>

      {termsQuery.isError || teachersQuery.isError || grantsQuery.isError ? (
        <ErrorState
          title="โหลดรายการลิงก์ไม่สำเร็จ"
          description="กรุณาลองโหลดข้อมูลโรงเรียนและลิงก์อีกครั้ง"
          onRetry={() => {
            void termsQuery.refetch();
            void teachersQuery.refetch();
            void grantsQuery.refetch();
          }}
        />
      ) : grantsQuery.isLoading ? (
        <SkeletonStack lines={5} />
      ) : grants.length === 0 ? (
        <EmptyState
          icon={Link2}
          title="ยังไม่มีลิงก์สำหรับตัวกรองนี้"
          description="ออกลิงก์ใหม่ให้ครูที่มีงานประจำชั้นหรือรายวิชาในภาคเรียนนี้"
          action={
            <Button
              icon={Plus}
              disabled={
                selectedTerm?.status !== "ACTIVE" ||
                !selectedTerm.endsOn ||
                activeTeachers.length === 0
              }
              onClick={() => setIssueOpen(true)}
            >
              ออกลิงก์ใหม่
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {grants.map((grant) => {
              const status = STATUS_META[grant.status];
              return (
                <Card key={grant.id}>
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle>{grant.teacherDisplayName}</CardTitle>
                        <p className="mt-1 text-sm text-slate-500">@{grant.teacherUsername}</p>
                      </div>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-slate-600">
                    <p>ปี {grant.academicYear} ภาค {grant.semester} · {grant.assignmentCount} งานสอน</p>
                    <div className="flex flex-wrap gap-2">
                      {grant.capabilities.map((capability) => (
                        <Badge key={capability} variant="secondary">{CAPABILITY_LABELS[capability]}</Badge>
                      ))}
                    </div>
                    <dl className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                      <div><dt className="text-xs text-slate-500">หมดอายุ</dt><dd>{formatDateTime(grant.expiresAt)}</dd></div>
                      <div><dt className="text-xs text-slate-500">ใช้ล่าสุด</dt><dd>{formatDateTime(grant.lastUsedAt)}</dd></div>
                    </dl>
                  </CardContent>
                  {grant.status === "ACTIVE" ? (
                    <CardFooter className="flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
                      <Button
                        icon={RefreshCw}
                        variant="outline"
                        disabled={rotateAccess.isPending}
                        onClick={() => void rotate(grant)}
                      >
                        เปลี่ยนลิงก์
                      </Button>
                      <Button
                        icon={ShieldOff}
                        variant="destructive"
                        onClick={() => { setRevokeGrant(grant); revokeAccess.reset(); }}
                      >
                        เพิกถอน
                      </Button>
                    </CardFooter>
                  ) : null}
                </Card>
              );
            })}
          </div>
          {meta ? (
            <Pagination
              page={meta.page}
              rowsPerPage={meta.limit}
              rowsPerPageOptions={[10, 20, 50]}
              totalCount={meta.totalCount}
              unitLabel="ลิงก์"
              onPageChange={setPage}
              onRowsPerPageChange={(value) => { setLimit(value); setPage(1); }}
            />
          ) : null}
        </div>
      )}

      <Dialog open={issueOpen} onOpenChange={(open) => open ? setIssueOpen(true) : closeIssueDialog()}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto" onClose={closeIssueDialog}>
          <DialogHeader>
            <DialogTitle>ออกลิงก์เข้าใช้งานครู</DialogTitle>
            <DialogDescription>กำหนดสิทธิ์เท่าที่จำเป็นและผูกกับงานสอนจริงในภาคเรียน</DialogDescription>
          </DialogHeader>
          <Form form={issueForm} onSubmit={submitIssue}>
            <DialogBody className="space-y-5">
              <FormErrorAlert error={issueGrant.error} fallback="ไม่สามารถออกลิงก์ได้" />
              <div>
                <Label htmlFor="grant-teacher">ครู</Label>
                <Select
                  id="grant-teacher"
                  {...issueForm.register("teacherMembershipId")}
                  onChange={(event) => {
                    issueForm.setValue("teacherMembershipId", event.target.value, { shouldValidate: true });
                    issueForm.setValue("assignmentIds", []);
                  }}
                >
                  <option value="">เลือกครู</option>
                  {activeTeachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>{teacher.displayName}</option>
                  ))}
                </Select>
                <FormMessage<IssueFormValues> name="teacherMembershipId" />
              </div>
              <fieldset>
                <legend className="mb-2 text-sm font-bold text-slate-700">ความสามารถ</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(Object.keys(CAPABILITY_LABELS) as TeacherAccessCapability[]).map((capability) => (
                    <Checkbox
                      key={capability}
                      label={CAPABILITY_LABELS[capability]}
                      checked={selectedCapabilities.includes(capability)}
                      onChange={(event) => {
                        const next = event.target.checked
                          ? [...selectedCapabilities, capability]
                          : selectedCapabilities.filter((item) => item !== capability);
                        issueForm.setValue("capabilities", next, { shouldValidate: true });
                        issueForm.setValue(
                          "assignmentIds",
                          selectedAssignmentIds.filter((id) => {
                            const assignment = assignmentOptions.find((item) => item.id === id);
                            return assignment?.allowedActions.some((item) => next.includes(item));
                          }),
                        );
                      }}
                    />
                  ))}
                </div>
                <FormMessage<IssueFormValues> name="capabilities" />
              </fieldset>
              <fieldset>
                <legend className="mb-2 text-sm font-bold text-slate-700">งานสอนที่อนุญาต</legend>
                {!teacherMembershipId ? (
                  <p className="text-sm text-slate-500">เลือกครูก่อนเพื่อดูงานสอน</p>
                ) : assignmentOptionsQuery.isLoading ? (
                  <SkeletonStack lines={3} />
                ) : visibleAssignments.length === 0 ? (
                  <Alert><AlertDescription>ไม่พบงานสอนที่ตรงกับความสามารถที่เลือก</AlertDescription></Alert>
                ) : (
                  <div className="max-h-52 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3">
                    {visibleAssignments.map((assignment) => (
                      <Checkbox
                        key={assignment.id}
                        label={assignmentLabel(assignment)}
                        checked={selectedAssignmentIds.includes(assignment.id)}
                        onChange={(event) => {
                          const next = event.target.checked
                            ? [...selectedAssignmentIds, assignment.id]
                            : selectedAssignmentIds.filter((id) => id !== assignment.id);
                          issueForm.setValue("assignmentIds", next, { shouldValidate: true });
                        }}
                      />
                    ))}
                  </div>
                )}
                <FormMessage<IssueFormValues> name="assignmentIds" />
              </fieldset>
              <div>
                <Label htmlFor="grant-expires">วันหมดอายุ (ไม่บังคับ)</Label>
                <Input
                  id="grant-expires"
                  type="datetime-local"
                  max={selectedTerm?.endsOn ? `${selectedTerm.endsOn}T23:59` : undefined}
                  {...issueForm.register("expiresAt")}
                />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={closeIssueDialog}>ยกเลิก</Button>
              <Button type="submit" isLoading={issueGrant.isPending} loadingText="กำลังออกลิงก์">ออกลิงก์</Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(revokeGrant)} onOpenChange={(open) => { if (!open) setRevokeGrant(null); }}>
        <DialogContent onClose={() => setRevokeGrant(null)}>
          <DialogHeader>
            <DialogTitle>เพิกถอนลิงก์ของ {revokeGrant?.teacherDisplayName}</DialogTitle>
            <DialogDescription>ครูจะเข้าใช้งานผ่านลิงก์นี้ไม่ได้ทันที</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <FormErrorAlert error={revokeAccess.error} fallback="ไม่สามารถเพิกถอนลิงก์ได้" />
            <div>
              <Label htmlFor="revoke-reason">เหตุผล</Label>
              <Textarea id="revoke-reason" value={revokeReason} onChange={(event) => setRevokeReason(event.target.value)} />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeGrant(null)}>ยกเลิก</Button>
            <Button
              variant="destructive"
              isLoading={revokeAccess.isPending}
              disabled={!revokeReason.trim()}
              onClick={() => void submitRevoke()}
            >
              เพิกถอนลิงก์
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(oneTimeUrl)}
        onOpenChange={(open) => {
          if (!open) clearOneTimeUrl();
        }}
      >
        <DialogContent onClose={clearOneTimeUrl}>
          <DialogHeader>
            <DialogTitle>ลิงก์พร้อมส่งให้ครู</DialogTitle>
            <DialogDescription>ระบบจะแสดงลิงก์นี้ครั้งเดียว คัดลอกก่อนปิดหน้าต่าง</DialogDescription>
          </DialogHeader>
          <DialogBody>
            {copyFailed ? (
              <Alert variant="destructive" className="mb-3">
                <AlertTitle>คัดลอกอัตโนมัติไม่สำเร็จ</AlertTitle>
                <AlertDescription>
                  {canNativeShare && !shareFailed
                    ? "เบราว์เซอร์ไม่อนุญาตให้เข้าถึงคลิปบอร์ด ลองส่งผ่านปุ่มแชร์แทน"
                    : "กรุณาเปิดผ่าน HTTPS แล้วลองอีกครั้ง หากปิดหน้าต่างนี้แล้วให้ออกลิงก์ใหม่เพื่อรักษาความปลอดภัย"}
                </AlertDescription>
              </Alert>
            ) : null}
            {shareFailed ? (
              <Alert variant="destructive" className="mb-3">
                <AlertTitle>แชร์ลิงก์ไม่สำเร็จ</AlertTitle>
                <AlertDescription>กรุณาเปิดผ่าน HTTPS แล้วลองอีกครั้ง หากปิดหน้าต่างนี้แล้วให้ออกลิงก์ใหม่</AlertDescription>
              </Alert>
            ) : null}
            <Alert variant={copied || shared ? "success" : "warning"}>
              <AlertTitle>{copied ? "คัดลอกแล้ว" : shared ? "ส่งไปยังแอปที่เลือกแล้ว" : "ลิงก์มีข้อมูลลับ"}</AlertTitle>
              <AlertDescription>อย่าส่งผ่านช่องทางสาธารณะ และเพิกถอนทันทีหากส่งผิดคน</AlertDescription>
            </Alert>
          </DialogBody>
          <DialogFooter align="between">
            <Button variant="outline" onClick={clearOneTimeUrl}>ปิด</Button>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              {canNativeShare ? (
                <Button icon={Share2} variant="outline" onClick={() => void shareOneTimeUrl()}>
                  แชร์ลิงก์
                </Button>
              ) : null}
              <Button icon={ClipboardCopy} onClick={() => void copyOneTimeUrl()}>คัดลอกลิงก์</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </PageShell>
  );
}
