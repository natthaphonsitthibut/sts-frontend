import {
  Bot,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  MapPin,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  FormErrorAlert,
  Label,
  Select,
  Textarea,
} from "../../../components/base";
import { EmptyState, SkeletonStack } from "../../../components/layout/page-primitives";
import { formatThaiDateTime } from "../../../lib/date-time";
import { usePermissions } from "../../auth/hooks/usePermissions";
import {
  useCreateHumanRiskReview,
  useGenerateObservationSummary,
  useHumanRiskReview,
  useManagedFollowUps,
  useManagedStudentObservations,
  useObservationSummary,
  useReviewFollowUp,
  useReviewObservationSummary,
} from "../hooks/useStudentObservations";
import type {
  FollowUpReviewDecision,
  FollowUpStatus,
  HumanRiskDecision,
  ObservationSourceRef,
  StudentFollowUpRequest,
  TeacherConcernSignal,
} from "../types/student-observation.types";

const humanDecisionLabels: Record<HumanRiskDecision, string> = {
  CONFIRM_RISK: "ยืนยันว่ามีความเสี่ยง",
  WATCH: "ติดตามต่อ",
  NO_ACTION: "ยังไม่ต้องดำเนินการ",
};

const teacherSignalLabels: Record<TeacherConcernSignal, string> = {
  NONE: "ยังไม่มีสัญญาณกังวล",
  WATCH: "ควรเฝ้าดู",
  CONCERN: "ครูระบุว่าน่ากังวล",
};

const followUpStatusLabels: Record<FollowUpStatus, string> = {
  PENDING_REVIEW: "รอพิจารณา",
  APPROVE_AND_ASSIGN: "อนุมัติให้มอบหมายต่อ",
  NEED_MORE_INFO: "ขอข้อมูลเพิ่ม",
  REJECT: "ไม่อนุมัติ",
};

interface FollowUpVisitPrefill {
  studentId: string;
  studentName: string;
  studentSchool: string | null;
  studentAddress: string | null;
  schoolId: string | number | null;
}

function derivedTeacherSignal(
  concerns: Array<"NOTE" | "WATCH" | "CONCERN">,
): TeacherConcernSignal {
  if (concerns.includes("CONCERN")) return "CONCERN";
  if (concerns.includes("WATCH")) return "WATCH";
  return "NONE";
}

function RiskSignalsCard({ studentTermId }: { studentTermId: string }) {
  const observationsQuery = useManagedStudentObservations(studentTermId);
  const reviewQuery = useHumanRiskReview(studentTermId);
  const createReview = useCreateHumanRiskReview(studentTermId);
  const [decision, setDecision] = useState<HumanRiskDecision>("WATCH");
  const [reason, setReason] = useState("");
  const observations = useMemo(
    () => observationsQuery.data?.data ?? [],
    [observationsQuery.data?.data],
  );
  const sourceObservations = useMemo<ObservationSourceRef[]>(
    () =>
      observations
        .map((observation) => ({
          observationId: Number(observation.id),
          revision: observation.revision,
        }))
        .filter(
          (source) =>
            Number.isSafeInteger(source.observationId) &&
            source.observationId > 0,
        )
        .slice(0, 20),
    [observations],
  );
  const review = reviewQuery.data;
  const teacherSignal =
    review?.teacherConcernSignal ??
    derivedTeacherSignal(observations.map((item) => item.concernLevel));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reason.trim() || sourceObservations.length === 0) return;
    try {
      await createReview.mutateAsync({
        expectedRevision: review?.revision ?? 0,
        humanRiskDecision: decision,
        decisionReason: reason.trim(),
        sourceObservations,
      });
      setReason("");
    } catch {
      // The mutation keeps conflict/validation details for the inline alert.
    }
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="size-5 text-primary" aria-hidden="true" />
          ทบทวนสัญญาณความเสี่ยง
        </CardTitle>
        <p className="text-sm text-slate-500">
          แยกผลคำนวณ ข้อสังเกตครู และคำตัดสินของผู้ทบทวนออกจากกัน
        </p>
      </CardHeader>
      <CardContent>
        {observationsQuery.isLoading || reviewQuery.isLoading ? (
          <SkeletonStack lines={4} />
        ) : observationsQuery.isError || reviewQuery.isError ? (
          <Alert variant="warning">
            <AlertTitle>โหลดสัญญาณบางส่วนไม่สำเร็จ</AlertTitle>
            <AlertDescription>
              ส่วนอื่นในหน้ารายละเอียดยังใช้งานได้ตามปกติ
            </AlertDescription>
            <Button
              className="mt-3"
              onClick={() => {
                void observationsQuery.refetch();
                void reviewQuery.refetch();
              }}
              size="sm"
              variant="outline"
            >
              โหลดใหม่
            </Button>
          </Alert>
        ) : (
          <>
            <dl className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 p-3">
                <dt className="text-xs font-semibold text-slate-500">
                  ผลคำนวณการมาเรียน
                </dt>
                <dd className="mt-1 font-semibold text-slate-900">
                  {review?.calculatedAttendanceRisk ?? "ยังไม่มี snapshot"}
                </dd>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <dt className="text-xs font-semibold text-slate-500">
                  สัญญาณจากครู
                </dt>
                <dd className="mt-1 font-semibold text-slate-900">
                  {teacherSignalLabels[teacherSignal]}
                </dd>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <dt className="text-xs font-semibold text-slate-500">
                  คำตัดสินผู้ทบทวน
                </dt>
                <dd className="mt-1 font-semibold text-slate-900">
                  {review
                    ? humanDecisionLabels[review.humanRiskDecision]
                    : "ยังไม่มีคำตัดสิน"}
                </dd>
              </div>
            </dl>

            {review ? (
              <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                <p>{review.decisionReason}</p>
                <p className="mt-1 text-xs">
                  {review.decidedBy.username} ·{" "}
                  {formatThaiDateTime(review.decidedAt)} · revision{" "}
                  {review.revision}
                </p>
              </div>
            ) : null}

            <form
              className="mt-4 space-y-3 border-t border-slate-200 pt-4"
              onSubmit={(event) => void submit(event)}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="human-risk-decision">คำตัดสินใหม่</Label>
                  <Select
                    id="human-risk-decision"
                    onChange={(event) =>
                      setDecision(event.target.value as HumanRiskDecision)
                    }
                    value={decision}
                  >
                    {Object.entries(humanDecisionLabels).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ),
                    )}
                  </Select>
                </div>
                <div className="flex items-end text-xs text-slate-500">
                  ใช้ optimistic revision {review?.revision ?? 0}{" "}
                  และข้อสังเกตล่าสุด {sourceObservations.length} รายการ
                </div>
              </div>
              <div>
                <Label htmlFor="human-risk-reason">เหตุผลประกอบคำตัดสิน</Label>
                <Textarea
                  id="human-risk-reason"
                  maxLength={1000}
                  onChange={(event) => setReason(event.target.value)}
                  required
                  rows={2}
                  value={reason}
                />
              </div>
              <FormErrorAlert
                error={createReview.error}
                fallback="บันทึกผลทบทวนไม่สำเร็จ"
              />
              <div className="flex justify-end">
                <Button
                  disabled={!reason.trim() || sourceObservations.length === 0}
                  isLoading={createReview.isPending}
                  loadingText="กำลังบันทึก"
                  type="submit"
                >
                  บันทึกผลทบทวน
                </Button>
              </div>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function FollowUpReviewItem({
  request,
  studentTermId,
  visitPrefill,
}: {
  request: StudentFollowUpRequest;
  studentTermId: string;
  visitPrefill: FollowUpVisitPrefill;
}) {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const reviewFollowUp = useReviewFollowUp(studentTermId);
  const [decision, setDecision] =
    useState<FollowUpReviewDecision>("APPROVE_AND_ASSIGN");
  const [reason, setReason] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reason.trim()) return;
    try {
      await reviewFollowUp.mutateAsync({
        requestId: request.id,
        input: {
          expectedRevision: request.revision,
          decision,
          reason: reason.trim(),
        },
      });
    } catch {
      // Conflict/validation state is rendered inline.
    }
  }

  return (
    <li className="rounded-lg border border-slate-200 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant={
            request.status === "PENDING_REVIEW" ? "warning" : "secondary"
          }
        >
          {followUpStatusLabels[request.status]}
        </Badge>
        <Badge
          variant={request.urgency === "URGENT" ? "destructive" : "secondary"}
        >
          {request.urgency === "URGENT" ? "เร่งด่วน" : "ปกติ"}
        </Badge>
        <span className="text-xs text-slate-500">
          revision {request.revision}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-700">{request.reason}</p>
      <p className="mt-1 text-xs text-slate-500">
        {request.requestedBy.username} · {formatThaiDateTime(request.createdAt)}{" "}
        · หลักฐาน {request.sourceObservations.length} รายการ
      </p>

      {request.status === "PENDING_REVIEW" ? (
        <form
          className="mt-3 space-y-3 border-t border-slate-100 pt-3"
          onSubmit={(event) => void submit(event)}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor={`follow-up-decision-${request.id}`}>
                ผลพิจารณา
              </Label>
              <Select
                id={`follow-up-decision-${request.id}`}
                onChange={(event) =>
                  setDecision(event.target.value as FollowUpReviewDecision)
                }
                value={decision}
              >
                <option value="APPROVE_AND_ASSIGN">อนุมัติให้มอบหมายต่อ</option>
                <option value="NEED_MORE_INFO">ขอข้อมูลเพิ่ม</option>
                <option value="REJECT">ไม่อนุมัติ</option>
              </Select>
            </div>
            <div>
              <Label htmlFor={`follow-up-reason-${request.id}`}>เหตุผล</Label>
              <Textarea
                id={`follow-up-reason-${request.id}`}
                maxLength={1000}
                onChange={(event) => setReason(event.target.value)}
                required
                rows={2}
                value={reason}
              />
            </div>
          </div>
          <FormErrorAlert
            error={reviewFollowUp.error}
            fallback="บันทึกผลพิจารณาไม่สำเร็จ"
          />
          <div className="flex justify-end">
            <Button
              disabled={!reason.trim()}
              isLoading={reviewFollowUp.isPending}
              loadingText="กำลังบันทึก"
              size="sm"
              type="submit"
            >
              บันทึกผลพิจารณา
            </Button>
          </div>
        </form>
      ) : request.review ? (
        <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          <p>
            {request.review.reason ?? followUpStatusLabels[request.status]} ·{" "}
            {request.review.reviewedBy.username}
          </p>
          {request.assignment ? (
            <Button
              className="mt-3"
              icon={ExternalLink}
              onClick={() => void navigate(`/tasks/${request.assignment?.taskId}`)}
              size="sm"
              variant="outline"
            >
              ดูงานที่มอบหมายแล้ว
            </Button>
          ) : request.status === "APPROVE_AND_ASSIGN" &&
            can("assign-follow-up-cases") &&
            can("create") ? (
            <Button
              className="mt-3"
              icon={MapPin}
              onClick={() => {
                void navigate("/create/visit", {
                  state: {
                    prefill: {
                      follow_up_request_id: request.id,
                      student_id: visitPrefill.studentId,
                      student_name: visitPrefill.studentName,
                      student_school: visitPrefill.studentSchool,
                      student_address: visitPrefill.studentAddress,
                      target_school_id: visitPrefill.schoolId,
                      reason_flagged: request.reason,
                    },
                  },
                });
              }}
              size="sm"
            >
              สร้างงานเยี่ยมบ้าน
            </Button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function FollowUpReviewCard({
  studentTermId,
  visitPrefill,
}: {
  studentTermId: string;
  visitPrefill: FollowUpVisitPrefill;
}) {
  const followUpsQuery = useManagedFollowUps(studentTermId);
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="size-5 text-primary" aria-hidden="true" />
          คำขอติดตามจากครู
        </CardTitle>
        <p className="text-sm text-slate-500">
          การอนุมัติเป็นเพียงผลทบทวน ยังไม่สร้างเคสหรือมอบหมายงานอัตโนมัติ
        </p>
      </CardHeader>
      <CardContent>
        {followUpsQuery.isLoading ? (
          <SkeletonStack lines={4} />
        ) : followUpsQuery.isError ? (
          <Alert variant="warning">
            <AlertTitle>โหลดคำขอติดตามไม่สำเร็จ</AlertTitle>
            <Button
              className="mt-3"
              onClick={() => void followUpsQuery.refetch()}
              size="sm"
              variant="outline"
            >
              โหลดใหม่
            </Button>
          </Alert>
        ) : (followUpsQuery.data?.data.length ?? 0) === 0 ? (
          <EmptyState className="px-5 py-8" title="ยังไม่มีคำขอติดตามจากครู" />
        ) : (
          <ul className="space-y-3">
            {followUpsQuery.data?.data.map((request) => (
              <FollowUpReviewItem
                key={request.id}
                request={request}
                studentTermId={studentTermId}
                visitPrefill={visitPrefill}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ObservationSummaryCard({ studentTermId }: { studentTermId: string }) {
  const summaryQuery = useObservationSummary(studentTermId);
  const generateSummary = useGenerateObservationSummary(studentTermId);
  const reviewSummary = useReviewObservationSummary(studentTermId);
  const [note, setNote] = useState("");
  const summary = summaryQuery.data?.data;
  const generationAvailable = summaryQuery.data?.generation.available ?? false;
  const unavailableAfterGenerate = generateSummary.data?.available === false;

  async function review(decision: "REVIEWED" | "REJECTED") {
    if (!summary || (decision === "REJECTED" && !note.trim())) return;
    try {
      await reviewSummary.mutateAsync({
        summaryId: summary.id,
        decision,
        note: note.trim() || undefined,
      });
      setNote("");
    } catch {
      // Review error remains local to this card.
    }
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bot className="size-5 text-primary" aria-hidden="true" />
              สรุปข้อสังเกต
              <Badge variant="secondary">สร้างโดย AI</Badge>
            </CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              ใช้ช่วยอ่านภาพรวมเท่านั้น ไม่เปลี่ยนความเสี่ยงหรือเปิดเคสอัตโนมัติ
            </p>
          </div>
          <Button
            disabled={
              !generationAvailable ||
              unavailableAfterGenerate ||
              generateSummary.isPending
            }
            icon={RefreshCw}
            isLoading={generateSummary.isPending}
            loadingText="กำลังสร้าง"
            onClick={() => generateSummary.mutate(undefined)}
            size="sm"
            variant="outline"
          >
            {summary ? "สร้างใหม่" : "สร้างสรุป"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {summaryQuery.isLoading ? (
          <SkeletonStack lines={5} />
        ) : summaryQuery.isError ? (
          <Alert variant="warning">
            <AlertTitle>โหลดสรุปไม่สำเร็จ</AlertTitle>
            <AlertDescription>
              ข้อมูลนักเรียนและส่วนทบทวนอื่นยังใช้งานได้ตามปกติ
            </AlertDescription>
            <Button
              className="mt-3"
              onClick={() => void summaryQuery.refetch()}
              size="sm"
              variant="outline"
            >
              โหลดสรุปใหม่
            </Button>
          </Alert>
        ) : !summary ? (
          <Alert variant="warning">
            <AlertTitle>ระบบสรุปอัตโนมัติยังไม่พร้อมใช้งาน</AlertTitle>
            <AlertDescription>
              ไม่มีสรุปที่บันทึกไว้ และการสร้างสรุปถูกปิดใช้งานในขณะนี้
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={summary.isStale ? "warning" : "success"}>
                {summary.isStale
                  ? "ข้อมูลต้นทางเปลี่ยนแล้ว"
                  : "อ้างอิงข้อมูลปัจจุบัน"}
              </Badge>
              <Badge
                variant={
                  summary.review.state === "REVIEWED"
                    ? "success"
                    : summary.review.state === "REJECTED"
                      ? "destructive"
                      : "warning"
                }
              >
                {summary.review.state === "REVIEWED"
                  ? "ตรวจแล้ว"
                  : summary.review.state === "REJECTED"
                    ? "ปฏิเสธแล้ว"
                    : "รอตรวจ"}
              </Badge>
              <span className="text-xs text-slate-500">
                สร้างเมื่อ {formatThaiDateTime(summary.generatedAt)} ·
                แหล่งข้อมูล {summary.sourceObservationCount} รายการ
              </span>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {summary.summaryText}
            </p>
            {summary.themes.length > 0 ? (
              <div
                className="flex flex-wrap gap-2"
                aria-label="ประเด็นจากสรุป AI"
              >
                {summary.themes.map((theme) => (
                  <Badge key={theme} variant="secondary">
                    {theme}
                  </Badge>
                ))}
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: "แนวโน้ม", items: summary.trends },
                { label: "ข้อมูลที่สอดคล้องกัน", items: summary.agreements },
                {
                  label: "ข้อมูลที่ยังขัดแย้ง",
                  items: summary.conflictingEvidence,
                },
              ].map((section) => (
                <section
                  className="rounded-lg border border-slate-200 p-3"
                  key={section.label}
                >
                  <h4 className="text-sm font-semibold text-slate-800">
                    {section.label}
                  </h4>
                  {section.items.length > 0 ? (
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-600">
                      {section.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">
                      ยังไม่มีข้อมูล
                    </p>
                  )}
                </section>
              ))}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-800">
                แหล่งอ้างอิง
              </h4>
              <ol className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                {summary.citations.map((citation) => (
                  <li
                    className="rounded-md bg-slate-100 px-2 py-1"
                    key={`${citation.observationId}-${citation.observationRevision}`}
                  >
                    ข้อสังเกต #{citation.observationId} · revision{" "}
                    {citation.observationRevision}
                  </li>
                ))}
              </ol>
            </div>
            {summary.review.state === "PENDING_REVIEW" && !summary.isStale ? (
              <div className="space-y-3 border-t border-slate-200 pt-4">
                <div>
                  <Label htmlFor="summary-review-note">
                    หมายเหตุการตรวจ (จำเป็นเมื่อปฏิเสธ)
                  </Label>
                  <Textarea
                    id="summary-review-note"
                    maxLength={1000}
                    onChange={(event) => setNote(event.target.value)}
                    rows={2}
                    value={note}
                  />
                </div>
                <FormErrorAlert
                  error={reviewSummary.error}
                  fallback="บันทึกผลตรวจสรุปไม่สำเร็จ"
                />
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    disabled={!note.trim() || reviewSummary.isPending}
                    onClick={() => void review("REJECTED")}
                    variant="outline"
                  >
                    ปฏิเสธสรุป
                  </Button>
                  <Button
                    disabled={reviewSummary.isPending}
                    icon={CheckCircle2}
                    isLoading={reviewSummary.isPending}
                    loadingText="กำลังบันทึก"
                    onClick={() => void review("REVIEWED")}
                  >
                    ยืนยันว่าตรวจแล้ว
                  </Button>
                </div>
              </div>
            ) : summary.review.note ? (
              <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                หมายเหตุผู้ตรวจ: {summary.review.note}
              </p>
            ) : null}
          </div>
        )}

        {unavailableAfterGenerate ? (
          <Alert className="mt-4" variant="warning">
            <AlertTitle>ปิดการสร้างสรุปชั่วคราว</AlertTitle>
            <AlertDescription>
              ระบบยังไม่พร้อมสร้างสรุป แต่ข้อมูลส่วนอื่นไม่ถูกกระทบ
            </AlertDescription>
          </Alert>
        ) : null}
        <FormErrorAlert
          error={generateSummary.error}
          fallback="สร้างสรุปไม่สำเร็จ"
        />
      </CardContent>
    </Card>
  );
}

export function StudentObservationManagementPanel({
  studentTermId,
  visitPrefill,
}: {
  studentTermId: string;
  visitPrefill: FollowUpVisitPrefill;
}) {
  return (
    <section className="mb-5 space-y-5" aria-label="ทบทวนข้อสังเกตนักเรียน">
      <RiskSignalsCard studentTermId={studentTermId} />
      <div className="grid gap-5 xl:grid-cols-2">
        <FollowUpReviewCard studentTermId={studentTermId} visitPrefill={visitPrefill} />
        <ObservationSummaryCard studentTermId={studentTermId} />
      </div>
    </section>
  );
}
