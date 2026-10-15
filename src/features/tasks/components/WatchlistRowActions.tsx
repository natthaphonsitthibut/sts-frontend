import { useState } from "react";
import { ClipboardList, Eye, ListChecks } from "lucide-react";
import { IconButton } from "../../../components/base";
import { DetailLinkButton } from "../../../components/layout/detail-link-button";
import { LinkShareButton } from "../../../components/layout/link-share-dialog";
import { useContextualNavigate } from "../../../components/layout/navigation-context";
import { CloseWatchDialog } from "../../cases/components/CloseWatchDialog";
import { OpenCaseDialog } from "../../cases/components/OpenCaseDialog";
import type { RiskDashboardRow } from "../types/risk-dashboard.types";
import { WatchDecisionDialog, type WatchDecision } from "./WatchDecisionDialog";
import { WatchlistObservationsDialog } from "./WatchlistObservationsDialog";

export function WatchlistRowActions({
  canOpenCase,
  canViewCase,
  canViewStudent,
  row,
}: {
  canOpenCase: boolean;
  canViewCase: boolean;
  canViewStudent: boolean;
  row: RiskDashboardRow;
}) {
  const [open, setOpen] = useState(false);
  const [observationsOpen, setObservationsOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const navigate = useContextualNavigate();
  const hasActiveCase =
    row.openCaseCount > 0 ||
    Boolean(row.latestCaseStatus && row.latestCaseStatus !== "RESOLVED");
  const viewAvailable = canViewCase && Boolean(row.latestCaseId);
  const openAvailable =
    canOpenCase && !hasActiveCase && row.pendingCommentCount > 0;
  const viewLabel = `ดูรายละเอียดเคสของ ${row.studentName}`;
  const decideLabel = `พิจารณานักเรียน ${row.studentName}`;

  function handleDecide(decision: WatchDecision): void {
    setDecisionOpen(false);
    if (decision === "OPEN_CASE") setOpen(true);
    else setCloseOpen(true);
  }

  return (
    <div className="flex items-center justify-center gap-2">
      {/* A button the account has no permission for is not shown at all
          (owner, 2026-10-15); disabled is only for a state not yet ready. */}
      {canViewStudent ? (
        <IconButton
          aria-label={`ดูข้อสังเกตทั้งหมดของ ${row.studentName}`}
          icon={Eye}
          onClick={() => setObservationsOpen(true)}
          title="ดูข้อสังเกตทั้งหมด"
          variant="view"
        />
      ) : null}
      {observationsOpen && canViewStudent ? (
        <WatchlistObservationsDialog
          lastCaseResolvedAt={row.lastCaseResolvedAt}
          lastWatchClosedAt={row.lastWatchClosedAt}
          onClose={() => setObservationsOpen(false)}
          studentId={row.studentId}
          studentName={row.studentName}
        />
      ) : null}
      {!canViewCase ? null : viewAvailable ? (
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
          title="ยังไม่มีเคสให้ดู"
          variant="view"
        />
      )}
      {canViewCase ? (
        <span
          title={
            row.latestCaseStatus === "RESOLVED"
              ? "เคสเสร็จสิ้นแล้ว"
              : row.latestCaseMagicLink
                ? "แชร์ลิงก์ติดตาม"
                : "ยังไม่มีลิงก์ติดตาม"
          }
        >
          <LinkShareButton
            compact
            disabled={
              !row.latestCaseMagicLink || row.latestCaseStatus === "RESOLVED"
            }
            link={row.latestCaseMagicLink ?? ""}
          />
        </span>
      ) : null}
      {canOpenCase ? (
        <>
          {/* เปิดเคส and ปิดการเฝ้าระวัง are one พิจารณา button that asks which
              (owner, 2026-10-15). Ready only when nothing is following the
              student and there is something new to decide. Green, like เปิดเคส on
              every other page. */}
          <IconButton
            aria-label={decideLabel}
            disabled={!openAvailable}
            icon={ListChecks}
            onClick={() => setDecisionOpen(true)}
            title={
              hasActiveCase
                ? "มีเคสที่กำลังติดตามอยู่"
                : row.pendingCommentCount === 0
                  ? "ไม่มีข้อสังเกตใหม่ที่รอพิจารณา"
                  : "พิจารณา: เปิดเคสหรือปิดการเฝ้าระวัง"
            }
            variant="contact"
          />
          <WatchDecisionDialog
            onDecide={handleDecide}
            onOpenChange={setDecisionOpen}
            open={decisionOpen}
            studentName={row.studentName}
          />
          <OpenCaseDialog
            initialReason={row.teacherComment?.trim().slice(0, 1000) ?? ""}
            onOpenChange={setOpen}
            onOpened={(caseRecord) => navigate(`/cases/${caseRecord.id}`)}
            open={open}
            studentId={row.studentId}
            studentName={row.studentName}
          />
          <CloseWatchDialog
            onOpenChange={setCloseOpen}
            open={closeOpen}
            studentId={row.studentId}
            studentName={row.studentName}
          />
        </>
      ) : null}
    </div>
  );
}
