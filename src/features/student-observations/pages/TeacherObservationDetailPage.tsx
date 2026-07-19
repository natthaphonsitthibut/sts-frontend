import { ArrowLeft, ClipboardList, UserRound } from "lucide-react";
import { useParams } from "react-router-dom";
import { Badge } from "../../../components/base";
import { NavButton } from "../../../components/layout/nav-button";
import { ErrorState, PageShell, PageToolbar, SkeletonStack } from "../../../components/layout/page-primitives";
import { formatThaiDateTime } from "../../../lib/date-time";
import { useTeacherObservationReport } from "../hooks/useStudentObservations";
import { getObservationConcernPresentation } from "../lib/observation-presentation";
import { StudentObservationManagementPanel } from "../components/StudentObservationManagementPanel";

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-800">{value || "-"}</div>
    </div>
  );
}

export function TeacherObservationDetailPage() {
  const { observationId = "" } = useParams<{ observationId: string }>();
  const report = useTeacherObservationReport(observationId);

  return (
    <PageShell>
      <PageToolbar
        actions={
          <NavButton icon={ArrowLeft} to="/student-risk-report/teacher-reports" variant="outline">
            ย้อนกลับ
          </NavButton>
        }
        description="อ่านข้อมูลที่ครูบันทึกไว้ครบถ้วนก่อนใช้ประกอบการทบทวนความเสี่ยง"
        icon={ClipboardList}
        title="รายละเอียดข้อสังเกต"
      />

      {report.isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-5"><SkeletonStack lines={6} /></div>
      ) : report.isError || !report.data ? (
        <ErrorState title="โหลดรายละเอียดข้อสังเกตไม่สำเร็จ" onRetry={() => void report.refetch()} />
      ) : (() => {
        const item = report.data;
        const concern = getObservationConcernPresentation(item.concernLevel);
        return (
          <div className="space-y-5">
            <section className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">{item.studentName}</h2>
                  <p className="mt-1 text-sm text-slate-500">{item.schoolName}{item.gradeLabel ? ` · ${item.gradeLabel}` : ""}{item.roomNo ? ` / ${item.roomNo}` : ""}</p>
                </div>
                <Badge className="w-fit" variant={concern.variant}>{concern.label}</Badge>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <DetailItem label="ด้านที่พบ" value={item.dimensionLabel} />
                <DetailItem label="ระดับข้อสังเกต" value={concern.label} />
                <DetailItem label="วันที่รายงาน" value={formatThaiDateTime(item.observedAt)} />
                <DetailItem label="ผู้รายงาน" value={item.authorDisplayName} />
                <DetailItem label="ชั้น" value={item.gradeLabel} />
                <DetailItem label="ห้อง" value={item.roomNo ? `ห้อง ${item.roomNo}` : "-"} />
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-bold text-slate-900">ความเห็นจากครู</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.comment || "ไม่ได้ระบุความเห็น"}</p>
            </section>

            <StudentObservationManagementPanel studentTermId={item.studentTermId} />

            <div className="flex justify-end">
              <NavButton icon={UserRound} to={`/students/${item.studentTermId}`} variant="outline">
                ดูข้อมูลนักเรียน
              </NavButton>
            </div>
          </div>
        );
      })()}
    </PageShell>
  );
}
