import { useMemo, useState } from "react";
import { LinkShareButton } from "../../../components/layout/link-share-dialog";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  type DataTableSortState,
  TableCard,
  TableCardList,
} from "../../../components/layout/data-table";
import { DetailLinkButton } from "../../../components/layout/detail-link-button";
import { LinkLockToggleButton } from "../../../components/layout/link-lock-toggle-button";
import { LinkShareActions } from "../../../components/layout/link-share-actions";
import { LinkStatusBadge } from "../../../components/layout/link-status-badge";
import { LinkTimeHeader, LinkTimeSummary } from "../../../components/layout/link-time-summary";
import { VISIT_LINKS_QUERY_KEY } from "../hooks/useVisitLinks";
import {
  getVisitLinkState,
  getVisitLinkStateMeta,
  isVisitLinkLocked,
} from "../lib/visit-links-presentation";
import type { VisitLink } from "../types/visit-links.types";
import { formatRoomLabel } from "../../../lib/room-presentation";
import { useStatusCatalog } from "../../status-catalog/hooks/useStatusCatalog";
import type { StatusCatalogItem } from "../../status-catalog/types/status-catalog.types";

interface VisitLinkTableProps {
  links: VisitLink[];
}

function StatusBadge({
  catalog,
  link,
}: {
  catalog: readonly StatusCatalogItem[];
  link: VisitLink;
}) {
  const meta = getVisitLinkStateMeta(link, catalog);
  return <LinkStatusBadge label={meta.label} variant={meta.variant} />;
}

function compareText(a: string | undefined, b: string | undefined): number {
  return (a || "").localeCompare(b || "", "th");
}

function getStudentLabel(link: VisitLink): string {
  return (
    link.student_name ||
    [link.student_first_name, link.student_last_name].filter(Boolean).join(" ") ||
    "-"
  );
}

function getClassSummary(link: VisitLink): string {
  const classLabel = [link.grade_label, link.room ? formatRoomLabel(link.room) : null]
    .filter(Boolean)
    .join(" ");
  return [link.school_name || link.student_school, classLabel].filter(Boolean).join(" · ");
}

function getVisitLinkSortValue(
  link: VisitLink,
  key: string,
  catalog: readonly StatusCatalogItem[],
): string {
  if (key === "student") return getStudentLabel(link);
  if (key === "school") return link.school_name || link.student_school || "";
  if (key === "grade") return link.grade_label || "";
  if (key === "room") return String(link.room ?? "");
  if (key === "assignee") return link.assigned_to_name || "";
  if (key === "status") return getVisitLinkStateMeta(link, catalog).label;
  if (key === "starts") return link.opens_at || link.created_at || "";
  if (key === "expires") return link.expires_at || "";
  if (key === "remaining") return link.expires_at || "";
  return "";
}

function LinkActions({ compact = false, link }: { compact?: boolean; link: VisitLink }) {
  const locked = isVisitLinkLocked(link);
  const linkState = getVisitLinkState(link);
  const canToggleLink = linkState !== "EXPIRED";
  const detailPath = `/tasks/${link.task_id}`;

  return (
    <div
      className={
        compact
          ? "flex flex-nowrap items-center justify-end gap-2"
          : "flex flex-wrap items-center justify-end gap-2"
      }
    >
      {link.magic_link && compact ? (
        <LinkShareButton compact link={link.magic_link} />
      ) : null}
      <DetailLinkButton
        aria-label="ดูรายละเอียดงาน"
        iconOnly={compact}
        to={detailPath}
      />
      {canToggleLink ? (
        <LinkLockToggleButton
          iconOnly={compact}
          invalidateKeys={[[VISIT_LINKS_QUERY_KEY]]}
          linkId={link.id}
          locked={locked}
        />
      ) : null}
    </div>
  );
}

export function VisitLinkTable({ links }: VisitLinkTableProps) {
  const linkStateCatalog = useStatusCatalog("TASK_LINK_STATE").items;
  const [sort, setSort] = useState<DataTableSortState | undefined>();
  const sortedLinks = useMemo(() => {
    if (!sort) return links;
    return [...links].sort((a, b) => {
      const result = compareText(
        getVisitLinkSortValue(a, sort.key, linkStateCatalog),
        getVisitLinkSortValue(b, sort.key, linkStateCatalog),
      );
      return sort.direction === "asc" ? result : -result;
    });
  }, [linkStateCatalog, links, sort]);

  return (
    <div className="flex flex-col gap-2">
      <DataTable
        headings={[
          { label: "นักเรียน", sortKey: "student" },
          { label: "โรงเรียน", sortKey: "school" },
          { label: "ชั้น", sortKey: "grade" },
          { label: "ห้อง", sortKey: "room" },
          { label: "ผู้รับมอบหมาย", sortKey: "assignee" },
          { label: "สถานะ", sortKey: "status" },
          { label: <LinkTimeHeader onSortChange={setSort} sort={sort} startLabel="เปิด" /> },
          "",
        ]}
        columnWidths={[
          "w-[14%]",
          "w-[13%]",
          "w-[6%]",
          "w-[7%]",
          "w-[13%]",
          "w-[9%]",
          "w-[25%]",
          "w-[13%]",
        ]}
        minWidthClassName="min-w-full"
        onSortChange={setSort}
        sort={sort}
      >
        {sortedLinks.map((link) => (
          <DataTableRow key={link.id}>
            <DataTableCell>
              <div className="font-bold text-slate-800">{getStudentLabel(link)}</div>
            </DataTableCell>
            <DataTableCell className="text-sm text-slate-600">
              {link.school_name || link.student_school || "-"}
            </DataTableCell>
            <DataTableCell className="text-sm font-medium text-slate-600">
              {link.grade_label || "-"}
            </DataTableCell>
            <DataTableCell className="text-sm text-slate-600">
              {formatRoomLabel(link.room)}
            </DataTableCell>
            <DataTableCell className="text-sm font-medium text-slate-600">
              {link.assigned_to_name || "-"}
            </DataTableCell>
            <DataTableCell>
              <StatusBadge catalog={linkStateCatalog} link={link} />
            </DataTableCell>
            <DataTableCell>
              <LinkTimeSummary
                expiresAt={link.expires_at}
                startLabel="เปิด"
                startsAt={link.opens_at || link.created_at}
                variant="columns"
              />
            </DataTableCell>
            <DataTableCell>
              <LinkActions compact link={link} />
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTable>

      <TableCardList>
        {sortedLinks.map((link) => (
          <TableCard key={link.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-bold text-slate-800">
                  {getStudentLabel(link)}
                </div>
                <div className="truncate text-xs text-slate-500">
                  {getClassSummary(link) || "-"}
                </div>
              </div>
              <StatusBadge catalog={linkStateCatalog} link={link} />
            </div>
            <div className="mt-3 rounded-md bg-slate-50 p-3">
              <LinkTimeSummary
                expiresAt={link.expires_at}
                startLabel="เปิด"
                startsAt={link.opens_at || link.created_at}
              />
            </div>
            <div className="mt-3 text-sm font-medium text-slate-600">
              ผู้รับมอบหมาย: {link.assigned_to_name || "-"}
            </div>
            {link.magic_link ? (
              <LinkShareActions className="mt-4" link={link.magic_link} />
            ) : null}
            <div className="mt-4">
              <LinkActions link={link} />
            </div>
          </TableCard>
        ))}
      </TableCardList>
    </div>
  );
}
