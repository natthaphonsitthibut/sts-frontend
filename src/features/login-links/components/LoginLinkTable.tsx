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
import {
  formatLoginLinkDateTime,
  getLoginLinkStatusMeta,
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
  if (key === "expires") return link.expires_at || "";
  return "";
}

function formatLinkAge(startValue?: string | null, endValue?: string | null): string {
  if (!startValue || !endValue) return "-";
  const start = new Date(startValue);
  const end = new Date(endValue);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "-";
  const totalHours = Math.max(0, Math.round((end.getTime() - start.getTime()) / 3_600_000));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days > 0 && hours > 0) return `${days} วัน ${hours} ชม.`;
  if (days > 0) return `${days} วัน`;
  return `${hours} ชม.`;
}

function LinkActions({ link, onToggleLock }: LoginLinkTableProps & { link: LoginLink }) {
  const locked = isLoginLinkLocked(link);
  return (
    <div className="flex flex-nowrap items-center justify-end gap-3">
      <DetailLinkButton to={`/login-links/${link.id}`} />
      <Button
        // Fixed min width so toggling "เปิด"/"ปิด" (different glyph counts) never
        // changes the button width and shifts the copy button beside it.
        className="min-w-[88px]"
        icon={locked ? LockOpen : Lock}
        onClick={() => onToggleLock(link)}
        size="sm"
        variant={locked ? "outline" : "destructive"}
      >
        {locked ? "เปิด" : "ปิด"}
      </Button>
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
          { label: "ช่วงเวลา", sortKey: "expires" },
          "จัดการ",
        ]}
        onSortChange={setSort}
        sort={sort}
      >
        {sortedLinks.map((link) => (
          <DataTableRow key={link.id}>
            <DataTableCell>
              <div className="font-bold text-slate-800">
                {link.assigned_to_name || "-"}
              </div>
              <div className="mt-0.5 text-xs text-slate-400">
                {link.assigned_to_email || "-"}
              </div>
            </DataTableCell>
            <DataTableCell className="text-sm font-medium text-slate-600">
              {link.login_role_label || link.login_role || "-"}
            </DataTableCell>
            <DataTableCell>
              <StatusBadge link={link} />
            </DataTableCell>
            <DataTableCell className="text-sm text-slate-500">
              <div>เริ่ม {formatLoginLinkDateTime(link.created_at)}</div>
              <div>หมดอายุ {formatLoginLinkDateTime(link.expires_at)}</div>
              <div className="text-xs text-slate-400">
                อายุ {formatLinkAge(link.created_at, link.expires_at)}
              </div>
            </DataTableCell>
            <DataTableCell>
              <LinkActions link={link} links={links} onToggleLock={onToggleLock} />
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
            <div className="mt-2 text-xs text-slate-400">
              เริ่ม {formatLoginLinkDateTime(link.created_at)}
              <br />
              หมดอายุ {formatLoginLinkDateTime(link.expires_at)}
              <br />
              อายุ {formatLinkAge(link.created_at, link.expires_at)}
            </div>
            <div className="mt-4">
              <LinkActions link={link} links={links} onToggleLock={onToggleLock} />
            </div>
          </TableCard>
        ))}
      </TableCardList>
    </div>
  );
}
