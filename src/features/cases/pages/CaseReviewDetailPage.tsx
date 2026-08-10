import type { ReactNode } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardCheck,
  FileText,
  UserRound,
} from "lucide-react";
import { useParams } from "react-router-dom";
import { Badge, Card } from "../../../components/base";
import { DetailLinkButton } from "../../../components/layout/detail-link-button";
import { NavButton } from "../../../components/layout/nav-button";
import {
  EmptyState,
  ErrorState,
  PageShell,
  PageToolbar,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import { formatThaiDate, formatThaiDateTime } from "../../../lib/date-time";
import { CaseFollowUpRoundDetails } from "../components/CaseFollowUpRoundDetails";
import { CaseStatusBadge } from "../components/CaseStatusBadge";
import { useCaseDetail } from "../hooks/useCaseDetail";
import { useCaseTrackingOptions } from "../hooks/useCaseTrackingOptions";
import type { CaseFollowUpRound, CaseReviewRecord } from "../types/cases.types";

function DetailItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg bg-slate-50 px-4 py-3">
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-semibold leading-6 text-slate-800">
        {value || "-"}
      </dd>
    </div>
  );
}

function findLatestSubmittedRoundBeforeReview(
  rounds: CaseFollowUpRound[],
  review: CaseReviewRecord,
): CaseFollowUpRound | null {
  const reviewedAt = Date.parse(review.reviewed_at);
  if (!Number.isFinite(reviewedAt)) return null;

  return rounds.reduce<CaseFollowUpRound | null>((latest, round) => {
    if (!round.submitted_at) return latest;
    const submittedAt = Date.parse(round.submitted_at);
    if (!Number.isFinite(submittedAt) || submittedAt > reviewedAt)
      return latest;
    if (!latest?.submitted_at) return round;
    return Date.parse(latest.submitted_at) < submittedAt ? round : latest;
  }, null);
}

export function CaseReviewDetailPage() {
  const { caseId: caseIdParam = "", reviewId = "" } = useParams<{
    caseId: string;
    reviewId: string;
  }>();
  const caseId = Number(caseIdParam);
  const validCaseId =
    Number.isInteger(caseId) && caseId > 0 ? caseId : undefined;
  const detailQuery = useCaseDetail(validCaseId);
  const trackingOptionsQuery = useCaseTrackingOptions();

  if (!validCaseId) {
    return (
      <PageShell>
        <EmptyState
          action={
            <NavButton to="/cases/risk" variant="outline">
              กลับรายการเคส
            </NavButton>
          }
          description="กรุณาเปิดรายละเอียดผลการพิจารณาจากรายการเคส"
          icon={FileText}
          title="รหัสเคสไม่ถูกต้อง"
        />
      </PageShell>
    );
  }

  if (detailQuery.isLoading) {
    return (
      <PageShell>
        <Card className="p-5">
          <SkeletonStack lines={7} />
        </Card>
      </PageShell>
    );
  }

  if (detailQuery.isError) {
    return (
      <PageShell>
        <ErrorState
          description="กรุณาตรวจสอบสิทธิ์หรือทดลองโหลดข้อมูลอีกครั้ง"
          onRetry={() => void detailQuery.refetch()}
          title="โหลดรายละเอียดผลการพิจารณาไม่สำเร็จ"
        />
      </PageShell>
    );
  }

  const caseRecord = detailQuery.data?.data;
  const review = caseRecord?.reviews?.find((item) => item.id === reviewId);

  if (!caseRecord || !review) {
    return (
      <PageShell>
        <EmptyState
          action={
            <NavButton to={-1} variant="outline">
              ย้อนกลับ
            </NavButton>
          }
          description="รายการนี้อาจไม่มีอยู่ในเคส หรืออยู่นอกขอบเขตข้อมูลของคุณ"
          icon={ClipboardCheck}
          title="ไม่พบผลการพิจารณา"
        />
      </PageShell>
    );
  }

  const optionLabel = (code: string | null | undefined): string | null => {
    if (!code) return null;
    const options = trackingOptionsQuery.data;
    return (
      options?.followUpDecisions.find((option) => option.code === code)
        ?.label ??
      options?.reviewActions.find((option) => option.code === code)?.label ??
      options?.resolutionOutcomes.find((option) => option.code === code)
        ?.label ??
      code
    );
  };
  const followUpRounds = caseRecord.follow_up_rounds ?? [];
  const supportingRound = findLatestSubmittedRoundBeforeReview(
    followUpRounds,
    review,
  );
  const supportingRoundNumber = supportingRound
    ? followUpRounds.findIndex(
        (round) => round.task_id === supportingRound.task_id,
      ) + 1
    : null;
  const reviewSummary =
    review.review_summary && review.review_summary !== review.review_note
      ? review.review_summary
      : null;

  return (
    <PageShell>
      <PageToolbar
        description="ตรวจผล เหตุผล และข้อมูลที่ใช้ประกอบการพิจารณารอบนี้"
        icon={ClipboardCheck}
        navigation={
          <NavButton icon={ArrowLeft} to={-1} variant="outline">
            ย้อนกลับ
          </NavButton>
        }
        title="รายละเอียดผลการพิจารณา"
      />

      <div className="space-y-5">
        <Card className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-slate-500">ผลการพิจารณา</p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">
                {optionLabel(review.review_action)}
              </h2>
            </div>
            <Badge
              variant={review.review_action === "CLOSE" ? "success" : "default"}
            >
              {optionLabel(review.review_action)}
            </Badge>
          </div>

          <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DetailItem
              label="วันที่พิจารณา"
              value={formatThaiDateTime(review.reviewed_at)}
            />
            <DetailItem label="ผู้พิจารณา" value={review.reviewed_by || "-"} />
            <DetailItem
              label="ผลลัพธ์เมื่อปิดเคส"
              value={optionLabel(review.resolution_outcome)}
            />
            <DetailItem
              label="สถานะเคสปัจจุบัน"
              value={
                <CaseStatusBadge
                  badgeVariant={caseRecord.status_badge_variant}
                  label={
                    caseRecord.display_status_label ?? caseRecord.status_label
                  }
                  status={caseRecord.status}
                />
              }
            />
          </dl>
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-bold text-slate-900">
            {review.review_action === "CONTINUE"
              ? "เหตุผลที่ให้ติดตามต่อ"
              : "เหตุผลที่ปิดเคส"}
          </h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
            {review.review_note || "ไม่มีบันทึกเพิ่มเติม"}
          </p>
          {reviewSummary ? (
            <>
              <h3 className="mt-5 text-sm font-bold text-slate-800">
                สรุปข้อมูลประกอบ
              </h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {reviewSummary}
              </p>
            </>
          ) : null}
        </Card>

        <section aria-labelledby="supporting-report-title">
          <div className="mb-3">
            <h2
              className="flex items-center gap-2 text-base font-bold text-slate-900"
              id="supporting-report-title"
            >
              <FileText className="size-5 text-primary" />
              รายงานล่าสุดก่อนการพิจารณา
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              ใช้ลำดับเวลาช่วยค้นหารายงานที่เกี่ยวข้อง
              เนื่องจากข้อมูลเดิมไม่ได้ผูกผลพิจารณากับรอบติดตามโดยตรง
            </p>
          </div>

          {supportingRound ? (
            <Card className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-900">
                    รอบติดตามที่ {supportingRoundNumber}
                  </h3>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="size-3.5" />
                      {formatThaiDateTime(
                        supportingRound.submitted_at ||
                          supportingRound.created_at,
                      )}
                    </span>
                    <span>
                      ผู้รับผิดชอบ: {supportingRound.initial_assignee || "-"}
                    </span>
                  </div>
                </div>
                <DetailLinkButton to={`/tasks/${supportingRound.task_id}`}>
                  ดูภารกิจ
                </DetailLinkButton>
              </div>
              <CaseFollowUpRoundDetails
                optionLabel={optionLabel}
                round={supportingRound}
              />
            </Card>
          ) : (
            <Card className="p-5 text-sm leading-6 text-slate-600">
              ไม่พบรายงานติดตามที่ส่งก่อนผลการพิจารณารายการนี้
            </Card>
          )}
        </section>

        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                บริบทของเคส
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                ข้อมูลตั้งต้นเพื่อทบทวนว่าการพิจารณาเกิดขึ้นกับเคสใด
              </p>
            </div>
            {caseRecord.student_id ? (
              <NavButton
                contextual
                icon={UserRound}
                to={`/students/${caseRecord.student_id}`}
                variant="outline"
              >
                ข้อมูลนักเรียน
              </NavButton>
            ) : null}
          </div>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DetailItem label="นักเรียน" value={caseRecord.student_name} />
            <DetailItem
              label="โรงเรียน"
              value={caseRecord.student_school || "-"}
            />
            <DetailItem
              label="วันที่เปิดเคส"
              value={formatThaiDate(caseRecord.created_at)}
            />
            <DetailItem label="รหัสเคส" value={String(caseRecord.id)} />
          </dl>
          <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3">
            <h3 className="text-xs font-semibold text-slate-500">
              เหตุผลที่เริ่มติดตามเคส
            </h3>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {caseRecord.reason_flagged || "ไม่ระบุเหตุผล"}
            </p>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
