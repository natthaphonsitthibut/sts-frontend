import { useParams } from "react-router-dom";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { Card } from "../../../components/base";
import {
  ErrorState,
  PageShell,
  PageToolbar,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import { NavButton } from "../../../components/layout/nav-button";
import { AuditLogDetailBlock } from "../components/AuditLogDetailBlock";
import { useAuditLogEntry } from "../hooks/useAuditLog";

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
        description="ประวัติการใช้งานตามสิทธิ์และขอบเขตข้อมูล"
        icon={ClipboardList}
        navigation={
          <NavButton icon={ArrowLeft} to={-1} variant="outline">
            ย้อนกลับ
          </NavButton>
        }
        title="รายละเอียดรายการ"
      />
      <Card className="p-5">
        <AuditLogDetailBlock entry={entry} />
      </Card>
    </PageShell>
  );
}
