import { useMemo, useState } from "react";
import { Lock, LockOpen } from "lucide-react";
import { Button } from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  type DataTableSortState,
  TableCard,
  TableCardList,
} from "../../../components/layout/data-table";
import { DetailLinkButton } from "../../../components/layout/detail-link-button";
import { LinkStatusBadge } from "../../../components/layout/link-status-badge";
import { LinkTimeHeader, LinkTimeSummary } from "../../../components/layout/link-time-summary";
import {
  getLoginLinkStatusMeta,
  getLoginLinkState,
  isLoginLinkLocked,
} from "../lib/login-links-presentation";
import type { LoginLink } from "../types/login-links.types";

interface LoginLinkTableProps {
  links: LoginLink[];
  onToggleLock: (link: LoginLink) => void;
}

function StatusBadge({ link }: { link: LoginLink }) {
  const meta = getLoginLinkStatusMeta(link);
  return <LinkStatusBadge label={meta.label} variant={meta.variant} />;
}

function compareText(a: string | undefined, b: string | undefined): number {
  return (a || "").localeCompare(b || "", "th");
}

function getLoginLinkSortValue(link: LoginLink, key: string): string {
  if (key === "recipient") return link.assigned_to_name || "";
  if (key === "role") return link.login_role_label || link.login_role || "";
  if (key === "status") return getLoginLinkStatusMeta(link).label;
  if (key === "starts") return link.created_at || "";
  if (key === "expires") return link.expires_at || "";
  if (key === "remaining") return link.expires_at || "";
  return "";
}

function LinkActions({
  compact = false,
  link,
  onToggleLock,
}: LoginLinkTableProps & { compact?: boolean; link: LoginLink }) {
  const locked = isLoginLinkLocked(link);
  const linkState = getLoginLinkState(link);
  const canToggleLink = linkState !== "EXPIRED";
  return (
    <div className="flex flex-nowrap items-center justify-center gap-2">
      <DetailLinkButton
        aria-label="ดูรายละเอียด"
        to={`/login-links/${link.id}`}
      />
      {canToggleLink ? (
        <Button
          aria-label={locked ? "เปิดลิงก์" : "ปิดลิงก์"}
          className={compact ? "size-9 shrink-0 px-0" : "min-w-[88px]"}
          icon={locked ? LockOpen : Lock}
          onClick={() => onToggleLock(link)}
          size="sm"
          variant={locked ? "outline" : "destructive"}
        >
          {compact ? null : locked ? "เปิด" : "ปิด"}
        </Button>
      ) : compact ? (
        <span className="size-9 shrink-0" aria-hidden="true" />
      ) : null}
    </div>
  );
}

export function LoginLinkTable({ links, onToggleLock }: LoginLinkTableProps) {
  const [sort, setSort] = useState<DataTableSortState | undefined>();
  const sortedLinks = useMemo(() => {
    if (!sort) return links;
    return [...links].sort((a, b) => {
      const result = compareText(
        getLoginLinkSortValue(a, sort.key),
        getLoginLinkSortValue(b, sort.key),
      );
      return sort.direction === "asc" ? result : -result;
    });
  }, [links, sort]);

  return (
    <div className="flex flex-col gap-2">
      <DataTable
        headings={[
          { label: "ผู้รับลิงก์", sortKey: "recipient" },
          { label: "ตำแหน่ง", sortKey: "role" },
          { label: "สถานะ", sortKey: "status" },
          { label: <LinkTimeHeader onSortChange={setSort} sort={sort} /> },
          "จัดการ",
        ]}
        columnWidths={[
          "w-[24%]",
          "w-[13%]",
          "w-[13%]",
          "w-[34%]",
          "w-[16%]",
        ]}
        minWidthClassName="min-w-full"
        onSortChange={setSort}
        sort={sort}
      >
        {sortedLinks.map((link) => (
          <DataTableRow key={link.id}>
            <DataTableCell>
              <div className="font-bold text-slate-800">
                {link.assigned_to_name || "-"}
              </div>
            </DataTableCell>
            <DataTableCell className="text-sm font-medium text-slate-600">
              {link.login_role_label || link.login_role || "-"}
            </DataTableCell>
            <DataTableCell>
              <StatusBadge link={link} />
            </DataTableCell>
            <DataTableCell>
              <LinkTimeSummary
                expiresAt={link.expires_at}
                startsAt={link.created_at}
                variant="columns"
              />
            </DataTableCell>
            <DataTableCell>
              <LinkActions
                compact
                link={link}
                links={links}
                onToggleLock={onToggleLock}
              />
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
                  {link.assigned_to_name || "-"}
                </div>
                <div className="truncate text-xs text-slate-400">
                  {link.login_role_label || link.login_role || "-"}
                </div>
              </div>
              <StatusBadge link={link} />
            </div>
            <div className="mt-3 rounded-md bg-slate-50 p-3">
              <LinkTimeSummary startsAt={link.created_at} expiresAt={link.expires_at} />
            </div>
            <div className="mt-4">
              <LinkActions
                link={link}
                links={links}
                onToggleLock={onToggleLock}
              />
            </div>
          </TableCard>
        ))}
      </TableCardList>
    </div>
  );
}
