import {
  Bot,
  CheckCircle2,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { useMemo, useState } from "react";
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
import { DetailLinkButton } from "../../../components/layout/detail-link-button";
import { useRiskTierLabels } from "../../students/hooks/useRiskTierLabels";
import {
  useCreateHumanRiskReview,
  useGenerateObservationSummary,
  useHumanRiskReview,
  useManagedStudentObservations,
  useObservationSummary,
  useReviewObservationSummary,
} from "../hooks/useStudentObservations";
import type {
  HumanRiskDecision,
  ObservationSourceRef,
  TeacherConcernSignal,
} from "../types/student-observation.types";
import { getObservationConcernPresentation } from "../lib/observation-presentation";

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

function derivedTeacherSignal(
  concerns: Array<"NOTE" | "WATCH" | "CONCERN">,
): TeacherConcernSignal {
  if (concerns.includes("CONCERN")) return "CONCERN";
  if (concerns.includes("WATCH")) return "WATCH";
  return "NONE";
}

function RiskSignalsCard({ studentTermId }: { studentTermId: string }) {
  const riskTierLabels = useRiskTierLabels();
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
  const review = reviewQuery.data?.review ?? null;
  const currentCalculatedAttendanceRisk =
    reviewQuery.data?.currentCalculatedAttendanceRisk ?? "UNKNOWN";
  const teacherSignal =
    review?.teacherConcernSignal ??
    derivedTeacherSignal(observations.map((item) => item.concernLevel));
  const hasCurrentEvidence =
    currentCalculatedAttendanceRisk !== "UNKNOWN" || observations.length > 0;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reason.trim()) return;
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
          เปรียบเทียบข้อมูลการมาเรียน ข้อสังเกตจากครู และคำตัดสินของผู้ทบทวน
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
                  ความเสี่ยงจากการมาเรียน
                </dt>
                <dd className="mt-1 font-semibold text-slate-900">
                  {currentCalculatedAttendanceRisk === "UNKNOWN"
                    ? "ยังไม่มีผลคำนวณ"
                    : riskTierLabels.getLabel(currentCalculatedAttendanceRisk)}
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
                  {review.decidedBy.username} · {formatThaiDateTime(review.decidedAt)}
                </p>
              </div>
            ) : null}

            {observations.length > 0 ? (
              <section className="mt-4 border-t border-slate-200 pt-4" aria-labelledby="risk-review-evidence-title">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 id="risk-review-evidence-title" className="font-bold text-slate-900">ข้อสังเกตที่ใช้ประกอบการทบทวน</h3>
                    <p className="mt-1 text-sm text-slate-500">อ่านด้านที่พบ ระดับ และความเห็นจากครูก่อนบันทึกผลการประเมิน</p>
                  </div>
                  <span className="text-xs text-slate-500">{sourceObservations.length} รายการล่าสุด</span>
                </div>
                <ol className="mt-3 space-y-3">
                  {observations.slice(0, 20).map((observation) => {
                    const concern = getObservationConcernPresentation(observation.concernLevel);
                    return (
                      <li className="rounded-lg border border-slate-200 p-3" key={observation.id}>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant={concern.variant}>{concern.label}</Badge>
                              <span className="font-semibold text-slate-800">{observation.dimension.labelTh}</span>
                            </div>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{observation.comment || "ไม่ได้ระบุความเห็น"}</p>
                            <p className="mt-2 text-xs text-slate-500">{observation.author.displayName} · {formatThaiDateTime(observation.observedAt)}</p>
                          </div>
                          <DetailLinkButton to={`/student-risk-report/teacher-reports/${observation.id}`} />
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>
            ) : null}

            {hasCurrentEvidence ? <form
              className="mt-4 space-y-3 border-t border-slate-200 pt-4"
              onSubmit={(event) => void submit(event)}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="human-risk-decision">ผลการประเมิน</Label>
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
                  {sourceObservations.length > 0
                    ? `อ้างอิงข้อสังเกตล่าสุด ${sourceObservations.length} รายการ`
                    : "ประเมินจากข้อมูลการมาเรียน"}
                </div>
              </div>
              <div>
                <Label required htmlFor="human-risk-reason">เหตุผลประกอบคำตัดสิน</Label>
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
                  disabled={!reason.trim()}
                  isLoading={createReview.isPending}
                  loadingText="กำลังบันทึก"
                  type="submit"
                >
                  บันทึกผลทบทวน
                </Button>
              </div>
            </form>
            : (
              <EmptyState
                className="mt-4 border-t border-slate-200 pt-4"
                icon={ShieldAlert}
                title="ยังไม่มีสัญญาณให้ทบทวน"
                description="เมื่อมีผลคำนวณจากการมาเรียนหรือข้อสังเกตจากครู ระบบจะแสดงแบบประเมินในส่วนนี้"
              />
            )}
          </>
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
}: {
  studentTermId: string;
}) {
  return (
    <section className="mb-5 space-y-5" aria-label="ทบทวนข้อสังเกตนักเรียน">
      <RiskSignalsCard studentTermId={studentTermId} />
      <div className="grid gap-5 xl:grid-cols-2">
        <ObservationSummaryCard studentTermId={studentTermId} />
      </div>
    </section>
  );
}
