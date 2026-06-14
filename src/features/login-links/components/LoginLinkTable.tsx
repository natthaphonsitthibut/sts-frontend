import { Lock, LockOpen } from "lucide-react";
import { Button } from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
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
  return (
    <div className="flex flex-col gap-2">
      <DataTable headings={["ผู้รับลิงก์", "ตำแหน่ง", "สถานะ", "หมดอายุ", "จัดการ"]}>
        {links.map((link) => (
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
              {formatLoginLinkDateTime(link.expires_at)}
            </DataTableCell>
            <DataTableCell>
              <LinkActions link={link} links={links} onToggleLock={onToggleLock} />
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTable>

      <TableCardList>
        {links.map((link) => (
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
              หมดอายุ {formatLoginLinkDateTime(link.expires_at)}
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
