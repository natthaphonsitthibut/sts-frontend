import { ClipboardCopy, Link2, RefreshCw, Settings, ShieldOff } from "lucide-react";
import { DropdownMenu, IconButton, type DropdownMenuItem } from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  type DataTableSortState,
  TableCard,
  TableCardList,
} from "../../../components/layout/data-table";
import { LinkStatusBadge } from "../../../components/layout/link-status-badge";
import { formatThaiDate } from "../../../lib/date-time";
import { TEACHER_LINK_STATUS_META } from "../lib/teacher-link-presentation";
import type { TeacherLinkRosterEntry } from "../types/teacher-access.types";

interface TeacherLinkTableProps {
  entries: TeacherLinkRosterEntry[];
  /** 1-based index of the first row on the current page, for the ลำดับ column. */
  startIndex: number;
  busyMembershipId: string | null;
  onCreate: (entry: TeacherLinkRosterEntry) => void;
  onCopy: (entry: TeacherLinkRosterEntry) => void;
  onRotate: (entry: TeacherLinkRosterEntry) => void;
  onRevoke: (entry: TeacherLinkRosterEntry) => void;
  sort?: DataTableSortState;
  onSortChange: (sort: DataTableSortState | undefined) => void;
}

function LinkStatus({ entry }: { entry: TeacherLinkRosterEntry }) {
  const meta = TEACHER_LINK_STATUS_META[entry.linkStatus];
  return (
    <div className="flex flex-col items-center gap-1">
      <LinkStatusBadge label={meta.label} variant={meta.variant} />
      {entry.linkStatus === "ACTIVE" && entry.expiresAt ? (
        <span className="text-xs text-slate-500">ถึง {formatThaiDate(entry.expiresAt)}</span>
      ) : null}
    </div>
  );
}

function rowActions(
  entry: TeacherLinkRosterEntry,
  handlers: Pick<TeacherLinkTableProps, "onCreate" | "onCopy" | "onRotate" | "onRevoke">,
): DropdownMenuItem[] {
  if (entry.linkStatus === "ACTIVE") {
    return [
      {
        id: "copy",
        label: entry.canCopyLink ? "คัดลอกลิงก์" : "ลิงก์เดิมคัดลอกไม่ได้ ต้องออกใหม่",
        icon: ClipboardCopy,
        disabled: !entry.canCopyLink,
        onSelect: () => handlers.onCopy(entry),
      },
      {
        id: "rotate",
        label: "ออกลิงก์ใหม่แทนลิงก์เดิม",
        icon: RefreshCw,
        onSelect: () => handlers.onRotate(entry),
      },
      {
        id: "revoke",
        label: "เพิกถอนลิงก์",
        icon: ShieldOff,
        destructive: true,
        onSelect: () => handlers.onRevoke(entry),
      },
    ];
  }
  return [
    {
      id: "create",
      label: "สร้างลิงก์เช็คชื่อ",
      icon: Link2,
      disabled: entry.assignmentCount === 0,
      onSelect: () => handlers.onCreate(entry),
    },
  ];
}

function RowMenu({
  entry,
  busy,
  ...handlers
}: Pick<TeacherLinkTableProps, "onCreate" | "onCopy" | "onRotate" | "onRevoke"> & {
  entry: TeacherLinkRosterEntry;
  busy: boolean;
}) {
  return (
    <div className="flex items-center justify-center">
      <DropdownMenu
        ariaLabel={`เครื่องมือลิงก์ของ ${entry.teacherDisplayName}`}
        header={
          entry.assignmentCount === 0
            ? "ครูคนนี้ยังไม่มีห้องหรือรายวิชาในภาคเรียนนี้"
            : `${entry.assignmentCount} ห้อง/รายวิชาในภาคเรียนนี้`
        }
        items={rowActions(entry, handlers)}
        trigger={(triggerProps) => (
          <IconButton
            {...triggerProps}
            aria-label={`เครื่องมือลิงก์ของ ${entry.teacherDisplayName}`}
            disabled={busy}
            icon={Settings}
            variant="edit"
          />
        )}
      />
    </div>
  );
}

export function TeacherLinkTable({
  entries,
  startIndex,
  busyMembershipId,
  sort,
  onSortChange,
  ...handlers
}: TeacherLinkTableProps) {
  return (
    <div className="flex flex-col gap-2">
      <DataTable
        columnWidths={["w-[10%]", "w-[40%]", "w-[30%]", "w-[20%]"]}
        headings={[
          { label: "ลำดับ", className: "text-center" },
          { label: "ชื่อ-นามสกุล", sortKey: "name" },
          { label: "สถานะลิงก์", sortKey: "linkStatus", className: "text-center" },
          { label: "เครื่องมือ", className: "text-center" },
        ]}
        minWidthClassName="min-w-[760px]"
        onSortChange={onSortChange}
        sort={sort}
      >
        {entries.map((entry, index) => (
          <DataTableRow key={entry.teacherMembershipId}>
            <DataTableCell className="text-center">{startIndex + index}</DataTableCell>
            <DataTableCell className="font-bold text-slate-800">
              {entry.teacherDisplayName}
              {entry.hasEmail ? null : (
                <p className="mt-1 text-xs font-medium text-warning-700">
                  ยังไม่มีอีเมล — เข้าลิงก์ไม่ได้จนกว่าจะเพิ่มอีเมลให้ครู
                </p>
              )}
            </DataTableCell>
            <DataTableCell className="text-center">
              <LinkStatus entry={entry} />
            </DataTableCell>
            <DataTableCell>
              <RowMenu
                busy={busyMembershipId === entry.teacherMembershipId}
                entry={entry}
                {...handlers}
              />
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTable>

      <TableCardList>
        {entries.map((entry) => (
          <TableCard key={entry.teacherMembershipId}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-bold text-slate-800">{entry.teacherDisplayName}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {entry.assignmentCount} ห้อง/รายวิชา
                </p>
              </div>
              <RowMenu
                busy={busyMembershipId === entry.teacherMembershipId}
                entry={entry}
                {...handlers}
              />
            </div>
            <div className="mt-3 flex items-center justify-between rounded-md bg-slate-50 p-3 text-sm">
              <span className="text-slate-500">สถานะลิงก์</span>
              <LinkStatus entry={entry} />
            </div>
          </TableCard>
        ))}
      </TableCardList>
    </div>
  );
}
