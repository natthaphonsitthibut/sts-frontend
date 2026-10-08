import { useState } from "react";
import { CirclePlus, ClipboardList } from "lucide-react";
import { IconButton } from "../../../components/base";
import { DetailLinkButton } from "../../../components/layout/detail-link-button";
import { LinkShareButton } from "../../../components/layout/link-share-dialog";
import { useContextualNavigate } from "../../../components/layout/navigation-context";
import { OpenCaseDialog } from "../../cases/components/OpenCaseDialog";
import type { RiskDashboardRow } from "../types/risk-dashboard.types";

export function WatchlistRowActions({
  canOpenCase,
  canViewCase,
  row,
}: {
  canOpenCase: boolean;
  canViewCase: boolean;
  row: RiskDashboardRow;
}) {
  const [open, setOpen] = useState(false);
  const navigate = useContextualNavigate();
  const hasActiveCase =
    row.openCaseCount > 0 ||
    Boolean(row.latestCaseStatus && row.latestCaseStatus !== "RESOLVED");
  const viewAvailable = canViewCase && Boolean(row.latestCaseId);
  const openAvailable = canOpenCase && !hasActiveCase;
  const viewLabel = `ดูรายละเอียดเคสของ ${row.studentName}`;
  const openLabel = `เปิดเคสติดตามนักเรียน ${row.studentName}`;

  return (
    <div className="flex items-center justify-center gap-2">
      {viewAvailable ? (
        <DetailLinkButton
          aria-label={viewLabel}
          icon={ClipboardList}
          iconOnly
          title="ดูรายละเอียดเคส"
          to={`/cases/${row.latestCaseId}`}
        />
      ) : (
        <IconButton
          aria-label={viewLabel}
          disabled
          icon={ClipboardList}
          title={canViewCase ? "ยังไม่มีเคสให้ดู" : "ไม่มีสิทธิ์ดูเคส"}
          variant="view"
        />
      )}
      <span
        title={
          !canViewCase
            ? "ไม่มีสิทธิ์แชร์ลิงก์"
            : row.latestCaseStatus === "RESOLVED"
              ? "เคสเสร็จสิ้นแล้ว"
              : row.latestCaseMagicLink
                ? "แชร์ลิงก์ติดตาม"
                : "ยังไม่มีลิงก์ติดตาม"
        }
      >
        <LinkShareButton
          compact
          disabled={
            !canViewCase ||
            !row.latestCaseMagicLink ||
            row.latestCaseStatus === "RESOLVED"
          }
          link={row.latestCaseMagicLink ?? ""}
        />
      </span>
      <IconButton
        aria-label={openLabel}
        disabled={!openAvailable}
        icon={CirclePlus}
        onClick={() => setOpen(true)}
        title={
          !canOpenCase
            ? "ไม่มีสิทธิ์เปิดเคส"
            : hasActiveCase
              ? "มีเคสที่กำลังติดตามอยู่"
              : "เปิดเคสติดตามนักเรียน"
        }
        variant="edit"
      />
      <OpenCaseDialog
        initialReason={row.teacherComment?.trim().slice(0, 1000) ?? ""}
        onOpenChange={setOpen}
        onOpened={(caseRecord) => navigate(`/cases/${caseRecord.id}`)}
        open={open}
        studentId={row.studentId}
        studentName={row.studentName}
      />
    </div>
  );
}
