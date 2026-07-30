import { useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardCheck,
  Eye,
  FileText,
  History,
  Plus,
  UserRound,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Card } from "../../../components/base";
import { NavButton } from "../../../components/layout/nav-button";
import {
  EmptyState,
  ErrorState,
  PageShell,
  PageToolbar,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import { appConfig } from "../../../config/env";
import { formatThaiDate, formatThaiDateTime } from "../../../lib/date-time";
import { usePermissions } from "../../auth/hooks/usePermissions";
import { CaseStatusBadge } from "../components/CaseStatusBadge";
import { CaseStatusUpdateDialog } from "../components/CaseStatusUpdateDialog";
import { useCaseDetail } from "../hooks/useCaseDetail";
import { useCaseTrackingOptions } from "../hooks/useCaseTrackingOptions";
import type { CaseReviewAction } from "../types/cases.types";

function DetailItem({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="rounded-lg bg-slate-50 px-4 py-3">
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-bold text-slate-800">{value || "-"}</dd>
    </div>
  );
}

function resolveUploadUrl(path: string): string {
  const configuredBaseUrl = appConfig.apiBaseUrl.trim();
  if (!configuredBaseUrl || configuredBaseUrl === "/") return path;

  try {
    const baseUrl = configuredBaseUrl.startsWith("http")
      ? configuredBaseUrl
      : window.location.origin;
    return new URL(path, baseUrl).toString();
  } catch {
    return path;
  }
}

function VisitPhotos({ value }: { value: string | null | undefined }) {
  if (!value) return null;
  let paths: string[] = [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) {
      paths = parsed.filter(
        (path): path is string => typeof path === "string" && path.startsWith("/uploads/"),
      );
    }
  } catch {
    paths = [];
  }
  if (paths.length === 0) return null;

  return (
    <div className="mt-4">
      <h4 className="text-sm font-semibold text-slate-700">รูปประกอบการติดตาม</h4>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {paths.map((path, index) => {
          const photoUrl = resolveUploadUrl(path);
          return (
            <a href={photoUrl} key={path} rel="noreferrer" target="_blank">
              <img
                alt={`รูปประกอบการติดตาม ${index + 1}`}
                className="aspect-video w-full rounded-lg border border-slate-200 object-cover"
                loading="lazy"
                src={photoUrl}
              />
            </a>
          );
        })}
      </div>
    </div>
  );
}

export function CaseDetailPage() {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const { caseId: caseIdParam } = useParams<{ caseId: string }>();
  const caseId = Number(caseIdParam);
  const [reviewOpen, setReviewOpen] = useState(false);
  const detailQuery = useCaseDetail(Number.isInteger(caseId) && caseId > 0 ? caseId : undefined);
  const trackingOptionsQuery = useCaseTrackingOptions();
  const caseRecord = detailQuery.data?.data;

  if (detailQuery.isLoading) {
    return (
      <PageShell>
        <Card className="p-5"><SkeletonStack lines={5} /></Card>
      </PageShell>
    );
  }

  if (detailQuery.isError) {
    return (
      <PageShell>
        <ErrorState
          description="กรุณาตรวจสอบสิทธิ์หรือทดลองโหลดข้อมูลอีกครั้ง"
          onRetry={() => void detailQuery.refetch()}
          title="โหลดรายละเอียดเคสไม่สำเร็จ"
        />
      </PageShell>
    );
  }

  if (!caseRecord) {
    return (
      <PageShell>
        <EmptyState
          action={<NavButton to={-1} variant="outline">ย้อนกลับ</NavButton>}
          icon={FileText}
          title="ไม่พบเคส"
          description="เคสนี้อาจอยู่นอกขอบเขตข้อมูลของคุณหรือถูกนำออกแล้ว"
        />
      </PageShell>
    );
  }

  const followUpRounds = caseRecord.follow_up_rounds ?? [];
  const latestRound = followUpRounds.at(-1);
  const canCreateRound =
    can("create") &&
    (caseRecord.status === "OPEN" ||
      (caseRecord.status === "IN_PROGRESS" && latestRound?.task_status === "COMPLETED"));
  const visitPrefill = {
    existing_case_id: String(caseRecord.id),
    student_id: caseRecord.student_id ?? null,
    student_name: caseRecord.student_name,
    student_school: caseRecord.student_school ?? null,
    student_address: caseRecord.student_address ?? null,
    reason_flagged: caseRecord.reason_flagged ?? null,
  };
  const optionLabel = (code: string | null | undefined): string | null => {
    if (!code) return null;
    const options = trackingOptionsQuery.data;
    return (
      options?.followUpDecisions.find((option) => option.code === code)?.label ??
      options?.reviewActions.find((option) => option.code === code)?.label ??
      options?.resolutionOutcomes.find((option) => option.code === code)?.label ??
      code
    );
  };
  const createFollowUpRound = () =>
    void navigate("/create/visit", { state: { prefill: visitPrefill } });
  const handleReviewed = (action: CaseReviewAction) => {
    if (action === "CONTINUE") {
      createFollowUpRound();
      return;
    }
    void detailQuery.refetch();
  };

  return (
    <PageShell>
      <PageToolbar
        description="อ่านรายงานการติดตามและประวัติให้ครบก่อนพิจารณาเคส"
        footerActions={
          <>
            {caseRecord.student_id ? (
              <NavButton icon={UserRound} to={`/students/${caseRecord.student_id}`} variant="outline">
                ข้อมูลนักเรียน
              </NavButton>
            ) : null}
            <NavButton icon={ArrowLeft} to={-1} variant="outline">
              ย้อนกลับ
            </NavButton>
          </>
        }
        icon={FileText}
        title="รายละเอียดเคสติดตามนักเรียน"
      />

      <Card className="mb-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900">{caseRecord.student_name}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {caseRecord.student_school || "ไม่ระบุโรงเรียน"}
            </p>
          </div>
          <CaseStatusBadge
            badgeVariant={caseRecord.status_badge_variant}
            label={caseRecord.status_label}
            status={caseRecord.status}
          />
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DetailItem label="ชั้น" value={caseRecord.grade} />
          <DetailItem label="ห้อง" value={caseRecord.room ? `ห้อง ${caseRecord.room}` : null} />
          <DetailItem label="วันที่เปิดเคส" value={formatThaiDate(caseRecord.created_at)} />
          <DetailItem label="รหัสเคส" value={String(caseRecord.id)} />
        </dl>
      </Card>

      <Card className="mb-5 p-5">
        <h2 className="text-base font-bold text-slate-800">เหตุผลที่เปิดเคส</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
          {caseRecord.reason_flagged || "ไม่ระบุเหตุผล"}
        </p>
      </Card>

      <section className="mb-5" aria-labelledby="follow-up-history-title">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900" id="follow-up-history-title">
              <History className="size-5 text-primary" />
              รายงานการติดตาม
            </h2>
            <p className="mt-1 text-sm text-slate-500">เรียงตามรอบติดตามตั้งแต่รอบแรก</p>
          </div>
          {canCreateRound ? (
            <Button icon={Plus} onClick={createFollowUpRound} variant="outline">
              สร้างรอบติดตาม
            </Button>
          ) : null}
        </div>

        {followUpRounds.length === 0 ? (
          <Card className="p-5 text-sm text-slate-500">ยังไม่มีรายงานการติดตาม</Card>
        ) : (
          <div className="space-y-4">
            {followUpRounds.map((round, index) => (
              <Card className="p-5" key={round.task_id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900">รอบติดตามที่ {index + 1}</h3>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="size-3.5" />
                        {formatThaiDateTime(round.submitted_at || round.created_at)}
                      </span>
                      <span>ผู้รับผิดชอบ: {round.initial_assignee || "-"}</span>
                    </div>
                  </div>
                  <NavButton icon={Eye} to={`/tasks/${round.task_id}`} variant="outline">
                    ดูภารกิจ
                  </NavButton>
                </div>

                {round.submitted_at ? (
                  <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                    <DetailItem label="ประเภทสาเหตุ" value={round.cause_category} />
                    <DetailItem label="ผลหลังการติดตาม" value={optionLabel(round.follow_up_decision)} />
                    <DetailItem label="รายละเอียดจากการเยี่ยมบ้าน" value={round.cause_detail} />
                    <DetailItem label="ข้อเสนอแนะ" value={round.recommendation} />
                    {round.resolution_outcome ? (
                      <DetailItem label="ผลลัพธ์การติดตาม" value={optionLabel(round.resolution_outcome)} />
                    ) : null}
                    {round.visit_lat != null && round.visit_lng != null ? (
                      <DetailItem
                        label="พิกัดที่บันทึก"
                        value={`${round.visit_lat}, ${round.visit_lng}`}
                      />
                    ) : null}
                    {round.address_changed ? (
                      <DetailItem
                        label="ข้อมูลที่เสนอให้อัปเดต"
                        value={
                          round.updated_student_address ||
                          (round.updated_lat != null && round.updated_lng != null
                            ? `${round.updated_lat}, ${round.updated_lng}`
                            : "มีการแก้ไขพิกัดบ้าน")
                        }
                      />
                    ) : null}
                  </dl>
                ) : (
                  <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    รอบนี้ยังไม่ได้ส่งรายงาน
                  </p>
                )}

                <VisitPhotos value={round.photo_paths} />
              </Card>
            ))}
          </div>
        )}
      </section>

      {(caseRecord.reviews ?? []).length > 0 ? (
        <Card className="mb-5 p-5">
          <h2 className="text-base font-bold text-slate-900">ประวัติการพิจารณา</h2>
          <div className="mt-4 divide-y divide-slate-200">
            {(caseRecord.reviews ?? []).map((review) => (
              <div className="py-3 first:pt-0 last:pb-0" key={review.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-slate-800">
                    {optionLabel(review.review_action)}
                  </span>
                  <span className="text-xs text-slate-500">
                    {formatThaiDateTime(review.reviewed_at)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {review.review_note || review.review_summary || "ไม่มีบันทึกเพิ่มเติม"}
                </p>
                <p className="mt-1 text-xs text-slate-500">โดย {review.reviewed_by || "-"}</p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {caseRecord.status === "PENDING_REVIEW" && can("review-cases") ? (
        <Card className="border-primary/20 bg-primary/5 p-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-bold text-slate-900">พิจารณาผลการติดตาม</h2>
              <p className="mt-1 text-sm text-slate-600">
                หลังตรวจรายงานแล้ว เลือกติดตามต่อหรือปิดเคส
              </p>
            </div>
            <Button icon={ClipboardCheck} onClick={() => setReviewOpen(true)}>
              พิจารณาผล
            </Button>
          </div>
        </Card>
      ) : null}

      <CaseStatusUpdateDialog
        caseRecord={caseRecord}
        onOpenChange={setReviewOpen}
        onUpdated={handleReviewed}
        open={reviewOpen}
      />
    </PageShell>
  );
}
