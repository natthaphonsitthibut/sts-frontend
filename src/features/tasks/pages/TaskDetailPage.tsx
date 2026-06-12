import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { Badge, Button, Card } from "../../../components/base";
import {
  ErrorState,
  PageShell,
  PageToolbar,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import { LinkShareActions } from "../../../components/layout/link-share-actions";
import { taskService } from "../api/task.service";
import {
  formatDateTime,
  getStatusLabel,
  getTaskTypeLabel,
  normalizeTaskPublicLink,
} from "../lib/task-presentation";

export function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const taskQuery = useQuery({
    queryKey: ["task-chain", taskId],
    queryFn: () => taskService.getTaskChain(taskId || ""),
    enabled: Boolean(taskId),
  });

  if (taskQuery.isLoading) {
    return (
      <PageShell>
        <Card className="p-6">
          <SkeletonStack lines={5} />
        </Card>
      </PageShell>
    );
  }

  if (taskQuery.isError || !taskQuery.data) {
    return (
      <PageShell>
        <ErrorState
          title="ไม่สามารถโหลดรายละเอียดภารกิจได้"
          onRetry={() => void taskQuery.refetch()}
        />
      </PageShell>
    );
  }

  const task = taskQuery.data;
  const firstSubmission = task.chain.find((link) => link.submission)?.submission;

  return (
    <PageShell>
      <PageToolbar
        icon={ClipboardList}
        title="รายละเอียดภารกิจ"
        description={task.task_id}
        actions={
          <Button icon={ArrowLeft} onClick={() => window.history.back()} variant="outline">
            ย้อนกลับ
          </Button>
        }
      />
      <div className="space-y-5">

        <Card className="rounded-lg p-6">
          <h2 className="mb-4 text-lg font-bold text-slate-900">ข้อมูลภารกิจ</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-sm text-slate-500">ประเภท</div>
              <div className="font-bold">{getTaskTypeLabel(task.task_type)}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">สถานะ</div>
              <Badge variant="secondary">{getStatusLabel(task.case_status || task.task_status)}</Badge>
            </div>
            <div>
              <div className="text-sm text-slate-500">นักเรียน</div>
              <div className="font-bold">{task.student_name || "-"}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">โรงเรียน / ชั้น</div>
              <div className="font-bold">
                {task.student_school || task.target_grade || "-"} {task.target_room || ""}
              </div>
            </div>
            <div className="sm:col-span-2">
              <div className="text-sm text-slate-500">สาเหตุ / สรุปผล</div>
              <div className="font-medium text-slate-700">
                {task.reason_flagged || task.result_summary || "-"}
              </div>
            </div>
          </div>
        </Card>

        <Card className="rounded-lg p-6">
          <h2 className="mb-4 text-lg font-bold text-slate-900">เส้นทางการมอบหมาย</h2>
          <div className="space-y-3">
            {task.chain.map((link, index) => (
              <div
                className="rounded-lg border border-slate-200 bg-white p-4"
                key={link.id}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-bold text-slate-900">
                      {index + 1}. {link.assigned_to_name || "ไม่ระบุผู้รับ"}
                    </div>
                    <div className="text-sm text-slate-500">
                      สร้างเมื่อ {formatDateTime(link.created_at)}
                    </div>
                  </div>
                  <Badge variant={link.status === "COMPLETED" ? "success" : "secondary"}>
                    {getStatusLabel(link.status)}
                  </Badge>
                </div>
                {link.magic_link ? (
                  <LinkShareActions
                    className="mt-3"
                    link={normalizeTaskPublicLink(link.magic_link)}
                  />
                ) : null}
              </div>
            ))}
          </div>
        </Card>

        {firstSubmission ? (
          <Card className="rounded-lg p-6">
            <h2 className="mb-4 text-lg font-bold text-slate-900">ข้อมูลรายงานการลงพื้นที่</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="text-sm text-slate-500">ประเภทสาเหตุ</div>
                <div className="font-bold">{firstSubmission.cause_category || "-"}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500">ส่งเมื่อ</div>
                <div className="font-bold">{formatDateTime(firstSubmission.submitted_at)}</div>
              </div>
              <div className="sm:col-span-2">
                <div className="text-sm text-slate-500">รายละเอียด</div>
                <div className="font-medium text-slate-700">
                  {firstSubmission.cause_detail || "-"}
                </div>
              </div>
              <div className="sm:col-span-2">
                <div className="text-sm text-slate-500">ข้อเสนอแนะ</div>
                <div className="font-medium text-slate-700">
                  {firstSubmission.recommendation || "-"}
                </div>
              </div>
            </div>
          </Card>
        ) : null}
      </div>
    </PageShell>
  );
}
