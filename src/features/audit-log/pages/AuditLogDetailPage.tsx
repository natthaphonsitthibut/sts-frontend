import { useParams } from "react-router-dom";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { Badge, Button, Card } from "../../../components/base";
import {
  ErrorState,
  PageShell,
  PageToolbar,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import { formatThaiDateTime } from "../../../lib/date-time";
import { AuditLogDetailBlock } from "../components/AuditLogDetailBlock";
import { useAuditLogEntry } from "../hooks/useAuditLog";
import { getAuditLogTargetLabel } from "../lib/audit-log-presentation";

export function AuditLogDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const detailQuery = useAuditLogEntry(id);

  if (detailQuery.isLoading) {
    return (
      <PageShell>
        <Card className="p-6">
          <SkeletonStack lines={5} />
        </Card>
      </PageShell>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <PageShell>
        <ErrorState
          title="ไม่สามารถโหลดรายละเอียดรายการได้"
          onRetry={() => void detailQuery.refetch()}
        />
      </PageShell>
    );
  }

  const entry = detailQuery.data;

  return (
    <PageShell>
      <PageToolbar
        icon={ClipboardList}
        title="รายละเอียดรายการ"
        description={`audit-log-${entry.id}`}
        actions={
          <Button icon={ArrowLeft} onClick={() => window.history.back()} variant="outline">
            ย้อนกลับ
          </Button>
        }
      />
      <div className="space-y-5">
        <Card className="rounded-lg p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">ข้อมูลรายการ</h2>
            <Badge variant="secondary">{entry.actionLabel}</Badge>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-sm text-slate-500">เวลา</div>
              <div className="font-bold tabular-nums">{formatThaiDateTime(entry.createdAt)}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">ผู้ทำรายการ</div>
              <div className="font-bold">{entry.actorLabel}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">ประเภท</div>
              <div className="font-bold">{entry.actionLabel}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">รหัสอ้างอิง</div>
              <div className="break-all font-bold">{getAuditLogTargetLabel(entry)}</div>
            </div>
          </div>
        </Card>

        <Card className="rounded-lg p-6">
          <h2 className="mb-4 text-lg font-bold text-slate-900">รายละเอียด</h2>
          <AuditLogDetailBlock entry={entry} showSummary={false} />
        </Card>
      </div>
    </PageShell>
  );
}
