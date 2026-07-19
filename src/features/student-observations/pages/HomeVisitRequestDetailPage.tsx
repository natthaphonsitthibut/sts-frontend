import { ArrowLeft, HouseHeart, UserRound } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { Badge, Button, FormErrorAlert, Label, Select, Textarea } from "../../../components/base";
import { DetailLinkButton } from "../../../components/layout/detail-link-button";
import { NavButton } from "../../../components/layout/nav-button";
import { ErrorState, PageShell, PageToolbar, SkeletonStack } from "../../../components/layout/page-primitives";
import { formatThaiDateTime } from "../../../lib/date-time";
import { CaseStatusBadge } from "../../cases/components/CaseStatusBadge";
import { findStatusCatalogItem, useStatusCatalog } from "../../status-catalog/hooks/useStatusCatalog";
import { useHomeVisitRequest, useReviewFollowUp } from "../hooks/useStudentObservations";
import { getHomeVisitUrgencyPresentation } from "../lib/observation-presentation";
import type { FollowUpReviewDecision } from "../types/student-observation.types";

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-800">{value || "-"}</div>
    </div>
  );
}

export function HomeVisitRequestDetailPage() {
  const { requestId = "" } = useParams<{ requestId: string }>();
  const request = useHomeVisitRequest(requestId);
  const statusCatalog = useStatusCatalog("STUDENT_FOLLOW_UP_REQUEST");
  const reviewRequest = useReviewFollowUp(request.data?.student.studentTermId ?? "");
  const [decision, setDecision] = useState<FollowUpReviewDecision>("APPROVED");
  const [reason, setReason] = useState("");

  async function submitReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!request.data || !reason.trim()) return;
    try {
      await reviewRequest.mutateAsync({
        requestId: request.data.id,
        input: {
          expectedRevision: request.data.revision,
          decision,
          reason: reason.trim(),
        },
      });
      setReason("");
    } catch {
      // The mutation error is rendered below the form.
    }
  }

  return (
    <PageShell>
      <PageToolbar
        actions={
          <NavButton icon={ArrowLeft} to="/student-risk-report/home-visit-requests" variant="outline">
            ย้อนกลับ
          </NavButton>
        }
        description="ตรวจเหตุผล หลักฐาน และผลพิจารณาของคำขอจากครู"
        icon={HouseHeart}
        title="รายละเอียดคำขอเยี่ยมบ้าน"
      />

      {request.isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-5"><SkeletonStack lines={7} /></div>
      ) : request.isError || !request.data ? (
        <ErrorState title="โหลดรายละเอียดคำขอเยี่ยมบ้านไม่สำเร็จ" onRetry={() => void request.refetch()} />
      ) : (() => {
        const item = request.data;
        const status = findStatusCatalogItem(statusCatalog.items, item.status);
        const urgency = getHomeVisitUrgencyPresentation(item.urgency);
        return (
          <div className="space-y-5">
            <section className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">{item.student.displayName}</h2>
                  <p className="mt-1 text-sm text-slate-500">{item.student.schoolName}{item.student.gradeLabel ? ` · ${item.student.gradeLabel}` : ""}{item.student.roomNo ? ` / ${item.student.roomNo}` : ""}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={urgency.variant}>{urgency.label}</Badge>
                  <Badge variant={status?.badgeVariant ?? "secondary"}>{status?.label ?? item.statusPresentation.labelTh}</Badge>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <DetailItem label="ผู้ขอ" value={item.requestedBy.username} />
                <DetailItem label="วันที่ส่งคำขอ" value={formatThaiDateTime(item.createdAt)} />
                <DetailItem label="ความเร่งด่วน" value={urgency.label} />
                <DetailItem label="ชั้น" value={item.student.gradeLabel} />
                <DetailItem label="ห้อง" value={item.student.roomNo ? `ห้อง ${item.student.roomNo}` : "-"} />
                <DetailItem label="เคส" value={item.openedCase ? <CaseStatusBadge status={item.openedCase.status} /> : "ยังไม่ได้เปิดเคส"} />
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-bold text-slate-900">เหตุผลที่ขอเยี่ยมบ้าน</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.reason}</p>
              {item.note ? <><h3 className="mt-5 font-bold text-slate-800">ข้อมูลเพิ่มเติม</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.note}</p></> : null}
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-bold text-slate-900">ข้อสังเกตที่แนบ</h2>
              {item.sourceObservations.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">คำขอนี้ไม่ได้แนบข้อสังเกต</p>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.sourceObservations.map((source) => (
                    <DetailLinkButton key={`${source.observationId}-${source.revision}`} to={`/student-risk-report/teacher-reports/${source.observationId}`}>
                      ดูข้อสังเกต #{source.observationId}
                    </DetailLinkButton>
                  ))}
                </div>
              )}
            </section>

            {item.status === "PENDING_REVIEW" ? (
              <section className="rounded-lg border border-slate-200 bg-white p-5">
                <h2 className="text-lg font-bold text-slate-900">พิจารณาคำขอ</h2>
                <p className="mt-1 text-sm text-slate-500">อนุมัติแล้วระบบจะเปิดเคสเยี่ยมบ้านทันที</p>
                <form className="mt-4 space-y-4" onSubmit={(event) => void submitReview(event)}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="home-visit-review-decision">ผลพิจารณา</Label>
                      <Select id="home-visit-review-decision" value={decision} onChange={(event) => setDecision(event.target.value as FollowUpReviewDecision)}>
                        <option value="APPROVED">อนุมัติและเปิดเคส</option>
                        <option value="REJECTED">ไม่อนุมัติ</option>
                      </Select>
                    </div>
                    <div>
                      <Label required htmlFor="home-visit-review-reason">เหตุผลประกอบการพิจารณา</Label>
                      <Textarea id="home-visit-review-reason" maxLength={1000} required rows={3} value={reason} onChange={(event) => setReason(event.target.value)} />
                    </div>
                  </div>
                  <FormErrorAlert error={reviewRequest.error} fallback="บันทึกผลพิจารณาไม่สำเร็จ" />
                  <div className="flex justify-end">
                    <Button disabled={!reason.trim()} isLoading={reviewRequest.isPending} loadingText="กำลังบันทึก" type="submit">บันทึกผลพิจารณา</Button>
                  </div>
                </form>
              </section>
            ) : null}

            {item.review ? (
              <section className="rounded-lg border border-slate-200 bg-white p-5">
                <h2 className="text-lg font-bold text-slate-900">ผลพิจารณา</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.review.reason || item.statusPresentation.labelTh}</p>
                <p className="mt-2 text-xs text-slate-500">{item.review.reviewedBy.username} · {formatThaiDateTime(item.review.reviewedAt)}</p>
              </section>
            ) : null}

            <div className="flex justify-end">
              <NavButton icon={UserRound} to={`/students/${item.student.studentTermId}`} variant="outline">
                ดูข้อมูลนักเรียน
              </NavButton>
            </div>
          </div>
        );
      })()}
    </PageShell>
  );
}
