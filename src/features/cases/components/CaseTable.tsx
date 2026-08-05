import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "../../../components/base";
import { DetailLinkButton } from "../../../components/layout/detail-link-button";
import { LinkTimeHeader, LinkTimeSummary } from "../../../components/layout/link-time-summary";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  type DataTableSortState,
  TableCard,
  TableCardList,
} from "../../../components/layout/data-table";
import { getCaseReason } from "../lib/case-presentation";
import type { CaseRecord } from "../types/cases.types";
import { CaseStatusBadge } from "./CaseStatusBadge";

interface CaseTableProps {
  rows: CaseRecord[];
  canCreateLinks?: boolean;
  onCreateLink: (caseRecord: CaseRecord) => void;
}

function CaseAction({
  canCreateLinks,
  caseRecord,
  onCreateLink,
}: {
  canCreateLinks: boolean;
  caseRecord: CaseRecord;
  onCreateLink: (caseRecord: CaseRecord) => void;
}) {
  if (!caseRecord.task_id && canCreateLinks) {
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

  return (
    <DetailLinkButton className="min-w-[140px]" to={`/cases/${caseRecord.id}`}>
      ดูรายละเอียด
    </DetailLinkButton>
  );
}

function compareText(a: string | undefined, b: string | undefined): number {
  return (a || "").localeCompare(b || "", "th");
}

function getCaseSortValue(caseRecord: CaseRecord, key: string): string {
  if (key === "student") return caseRecord.student_name || "";
  if (key === "reason") return getCaseReason(caseRecord.reason, caseRecord.reason_flagged);
  if (key === "assignee") return caseRecord.latest_link_assigned_to || "";
  if (key === "status") return caseRecord.status || "";
  if (key === "starts") return caseRecord.active_link_created_at || caseRecord.created_at || "";
  if (key === "expires") return caseRecord.active_link_expires_at || "";
  if (key === "remaining") return caseRecord.active_link_expires_at || "";
  return "";
}

export function CaseTable({
  rows,
  canCreateLinks = true,
  onCreateLink,
}: CaseTableProps) {
  const [sort, setSort] = useState<DataTableSortState | undefined>();
  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    return [...rows].sort((a, b) => {
      const result = compareText(
        getCaseSortValue(a, sort.key),
        getCaseSortValue(b, sort.key),
      );
      return sort.direction === "asc" ? result : -result;
    });
  }, [rows, sort]);

  return (
    <div className="flex flex-col gap-2">
      <DataTable
        headings={[
          { label: "นักเรียน", sortKey: "student" },
          { label: "สาเหตุ", sortKey: "reason" },
          { label: "ผู้รับลิงก์", sortKey: "assignee" },
          { label: "สถานะ", sortKey: "status" },
          { label: <LinkTimeHeader onSortChange={setSort} sort={sort} /> },
          "",
        ]}
        columnWidths={[
          "w-[16%]",
          "w-[18%]",
          "w-[13%]",
          "w-[12%]",
          "w-[26%]",
          "w-[15%]",
        ]}
        minWidthClassName="min-w-full"
        onSortChange={setSort}
        sort={sort}
      >
        {sortedRows.map((caseRecord) => (
          <DataTableRow key={caseRecord.id}>
            <DataTableCell>
              <div className="text-slate-800">
                {caseRecord.student_name}
              </div>
              <div className="mt-0.5 text-xs text-slate-500">
                {caseRecord.student_school || "-"}
              </div>
            </DataTableCell>
            <DataTableCell className="text-sm text-slate-600">
              {getCaseReason(caseRecord.reason, caseRecord.reason_flagged)}
            </DataTableCell>
            <DataTableCell className="text-sm text-slate-600">
              {caseRecord.latest_link_assigned_to || "-"}
            </DataTableCell>
            <DataTableCell>
              <CaseStatusBadge
                badgeVariant={caseRecord.status_badge_variant}
                label={caseRecord.display_status_label ?? caseRecord.status_label}
                status={caseRecord.status}
              />
            </DataTableCell>
            <DataTableCell>
              <LinkTimeSummary
                expiresAt={caseRecord.active_link_expires_at}
                startsAt={caseRecord.active_link_created_at ?? caseRecord.created_at}
                variant="columns"
              />
            </DataTableCell>
            <DataTableCell className="text-right">
              <CaseAction
                canCreateLinks={canCreateLinks}
                caseRecord={caseRecord}
                onCreateLink={onCreateLink}
              />
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTable>

      <TableCardList>
        {sortedRows.map((caseRecord) => (
          <TableCard key={caseRecord.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-slate-800">
                  {caseRecord.student_name}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {caseRecord.student_school || "-"}
                </div>
              </div>
              <CaseStatusBadge
                badgeVariant={caseRecord.status_badge_variant}
                label={caseRecord.display_status_label ?? caseRecord.status_label}
                status={caseRecord.status}
              />
            </div>
            <p className="mt-3 text-sm text-slate-600">
              {getCaseReason(caseRecord.reason, caseRecord.reason_flagged)}
            </p>
            {caseRecord.task_id ? (
              <div className="mt-3 text-sm text-slate-600">
                <span className="text-slate-500">ผู้รับลิงก์:</span>{" "}
                {caseRecord.latest_link_assigned_to || "-"}
              </div>
            ) : null}
            <div className="mt-3 rounded-md bg-slate-50 p-3">
              <LinkTimeSummary
                startsAt={caseRecord.active_link_created_at ?? caseRecord.created_at}
                expiresAt={caseRecord.active_link_expires_at}
              />
            </div>
            <div className="mt-4 flex items-center justify-end">
              <CaseAction
                canCreateLinks={canCreateLinks}
                caseRecord={caseRecord}
                onCreateLink={onCreateLink}
              />
            </div>
          </TableCard>
        ))}
      </TableCardList>
    </div>
  );
}
