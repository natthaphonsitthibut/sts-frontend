import { Plus } from "lucide-react";
import { Button } from "../../../components/base";
import { DetailLinkButton } from "../../../components/layout/detail-link-button";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  TableCard,
  TableCardList,
} from "../../../components/layout/data-table";
import {
  formatCaseDate,
  getCaseReason,
} from "../lib/case-presentation";
import type { CaseRecord } from "../types/cases.types";
import { CaseStatusBadge } from "./CaseStatusBadge";
import { CaseReviewActionButton } from "./CaseReviewActionButton";

interface CaseTableProps {
  rows: CaseRecord[];
  onCreateLink: (caseRecord: CaseRecord) => void;
  onUpdate: (caseRecord: CaseRecord) => void;
}

function CaseAction({
  caseRecord,
  onCreateLink,
  onUpdate,
}: {
  caseRecord: CaseRecord;
  onCreateLink: (caseRecord: CaseRecord) => void;
  onUpdate: (caseRecord: CaseRecord) => void;
}) {
  if (!caseRecord.task_id) {
    return (
      <Button
        className="min-w-[140px]"
        icon={Plus}
        onClick={() => onCreateLink(caseRecord)}
        size="sm"
      >
        สร้างลิงก์
      </Button>
    );
  }

  if (caseRecord.status === "PENDING_REVIEW") {
    return (
      <CaseReviewActionButton onClick={() => onUpdate(caseRecord)}>
        ดำเนินการ
      </CaseReviewActionButton>
    );
  }

  return (
    <DetailLinkButton className="min-w-[140px]" to={`/task-detail/${caseRecord.task_id}`}>
      ดูรายละเอียด
    </DetailLinkButton>
  );
}

export function CaseTable({ rows, onCreateLink, onUpdate }: CaseTableProps) {
  return (
    <div className="flex flex-col gap-2">
      <DataTable headings={["นักเรียน", "สาเหตุ", "สถานะ", "วันที่", "ดำเนินการ"]}>
        {rows.map((caseRecord) => (
          <DataTableRow key={caseRecord.id}>
            <DataTableCell>
              <div className="font-bold text-slate-800">
                {caseRecord.student_name}
              </div>
              <div className="mt-0.5 text-xs text-slate-400">
                {caseRecord.student_school || "-"}
              </div>
            </DataTableCell>
            <DataTableCell className="text-sm text-slate-600">
              {getCaseReason(caseRecord.reason, caseRecord.reason_flagged)}
            </DataTableCell>
            <DataTableCell>
              <CaseStatusBadge status={caseRecord.status} />
            </DataTableCell>
            <DataTableCell className="text-sm font-medium text-slate-500">
              {formatCaseDate(caseRecord.created_at)}
            </DataTableCell>
            <DataTableCell className="text-right">
              <CaseAction
                caseRecord={caseRecord}
                onCreateLink={onCreateLink}
                onUpdate={onUpdate}
              />
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTable>

      <TableCardList>
        {rows.map((caseRecord) => (
          <TableCard key={caseRecord.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-bold text-slate-800">
                  {caseRecord.student_name}
                </div>
                <div className="mt-0.5 text-xs text-slate-400">
                  {caseRecord.student_school || "-"}
                </div>
              </div>
              <CaseStatusBadge status={caseRecord.status} />
            </div>
            <p className="mt-3 text-sm text-slate-600">
              {getCaseReason(caseRecord.reason, caseRecord.reason_flagged)}
            </p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">
                {formatCaseDate(caseRecord.created_at)}
              </span>
              <CaseAction
                caseRecord={caseRecord}
                onCreateLink={onCreateLink}
                onUpdate={onUpdate}
              />
            </div>
          </TableCard>
        ))}
      </TableCardList>
    </div>
  );
}
