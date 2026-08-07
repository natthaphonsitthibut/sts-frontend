import { ClipboardCopy, Link2, RefreshCw, Settings, ShieldOff, Unlink } from "lucide-react";
import {
  Checkbox,
  DropdownMenu,
  IconButton,
  type DropdownMenuItem,
} from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  type DataTableSortState,
  TableCard,
  TableCardList,
} from "../../../components/layout/data-table";
import { LinkStatusBadge } from "../../../components/layout/link-status-badge";
import {
  TEACHER_LINE_STATUS_META,
  TEACHER_LINK_STATUS_META,
} from "../lib/teacher-link-presentation";
import type { TeacherLinkRosterEntry } from "../types/teacher-access.types";

interface TeacherLinkTableProps {
  entries: TeacherLinkRosterEntry[];
  /** 1-based index of the first row on the current page, for the ลำดับ column. */
  startIndex: number;
  busyMembershipId: string | null;
  selectedIds: ReadonlySet<string>;
  onSelectRow: (entry: TeacherLinkRosterEntry, selected: boolean) => void;
  onSelectAll: (entries: readonly TeacherLinkRosterEntry[], selected: boolean) => void;
  onCreate: (entry: TeacherLinkRosterEntry) => void;
  onCopy: (entry: TeacherLinkRosterEntry) => void;
  onRotate: (entry: TeacherLinkRosterEntry) => void;
  onRevoke: (entry: TeacherLinkRosterEntry) => void;
  onUnlinkLine: (entry: TeacherLinkRosterEntry) => void;
  sort?: DataTableSortState;
  onSortChange: (sort: DataTableSortState | undefined) => void;
}

function LinkStatus({ entry }: { entry: TeacherLinkRosterEntry }) {
  const meta = TEACHER_LINK_STATUS_META[entry.linkStatus];
  return (
    <div className="flex justify-center">
      <LinkStatusBadge label={meta.label} variant={meta.variant} />
    </div>
  );
}

function LineStatus({ entry }: { entry: TeacherLinkRosterEntry }) {
  const meta = TEACHER_LINE_STATUS_META[entry.lineStatus];
  return (
    <div className="flex justify-center">
      <LinkStatusBadge label={meta.label} variant={meta.variant} />
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
}: Pick<
  TeacherLinkTableProps,
  "onCreate" | "onCopy" | "onRotate" | "onRevoke" | "onUnlinkLine"
> & {
  entry: TeacherLinkRosterEntry;
  busy: boolean;
}) {
  return (
    <div className="flex items-center justify-center gap-1">
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
      <IconButton
        aria-busy={busy}
        aria-label={`ปลดการเชื่อมต่อ LINE ของ ${entry.teacherDisplayName}`}
        disabled={busy || entry.lineStatus === "NOT_VERIFIED"}
        icon={Unlink}
        onClick={() => handlers.onUnlinkLine(entry)}
        title={
          entry.lineStatus === "NOT_VERIFIED"
            ? "ครูคนนี้ยังไม่ได้ยืนยันบัญชี LINE"
            : `ปลดการเชื่อมต่อ LINE ของ ${entry.teacherDisplayName}`
        }
        variant="lock"
      />
    </div>
  );
}

export function TeacherLinkTable({
  entries,
  startIndex,
  busyMembershipId,
  selectedIds,
  onSelectRow,
  onSelectAll,
  sort,
  onSortChange,
  ...handlers
}: TeacherLinkTableProps) {
  const allSelected =
    entries.length > 0 && entries.every((entry) => selectedIds.has(entry.teacherMembershipId));

  return (
    <div className="flex flex-col gap-2">
      <DataTable
        columnWidths={["w-[5%]", "w-[8%]", "w-[29%]", "w-[22%]", "w-[22%]", "w-[14%]"]}
        headings={[
          {
            label: (
              <Checkbox
                aria-label="เลือกครูทั้งหมดในหน้านี้"
                checked={allSelected}
                onChange={(event) => onSelectAll(entries, event.currentTarget.checked)}
              />
            ),
            className: "text-center",
          },
          { label: "ลำดับ" },
          { label: "ชื่อ-นามสกุล", sortKey: "name" },
          { label: "สถานะลิงก์", sortKey: "linkStatus", className: "text-center" },
          { label: "LINE", className: "text-center" },
          { label: "เครื่องมือ", className: "text-center" },
        ]}
        minWidthClassName="min-w-[940px]"
        onSortChange={onSortChange}
        sort={sort}
      >
        {entries.map((entry, index) => (
          <DataTableRow key={entry.teacherMembershipId}>
            <DataTableCell className="text-center">
              <Checkbox
                aria-label={`เลือก ${entry.teacherDisplayName}`}
                checked={selectedIds.has(entry.teacherMembershipId)}
                onChange={(event) => onSelectRow(entry, event.currentTarget.checked)}
              />
            </DataTableCell>
            <DataTableCell>{startIndex + index}</DataTableCell>
            <DataTableCell className="text-slate-800">
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
            <DataTableCell className="text-center">
              <LineStatus entry={entry} />
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
              <div className="flex min-w-0 items-start gap-3">
                <Checkbox
                  aria-label={`เลือก ${entry.teacherDisplayName}`}
                  checked={selectedIds.has(entry.teacherMembershipId)}
                  className="mt-0.5"
                  onChange={(event) => onSelectRow(entry, event.currentTarget.checked)}
                />
                <div className="min-w-0">
                  <p className="truncate text-slate-800">{entry.teacherDisplayName}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {entry.assignmentCount} ห้อง/รายวิชา
                  </p>
                </div>
              </div>
              <RowMenu
                busy={busyMembershipId === entry.teacherMembershipId}
                entry={entry}
                {...handlers}
              />
            </div>
            <div className="mt-3 space-y-2 rounded-md bg-slate-50 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">สถานะลิงก์</span>
                <LinkStatus entry={entry} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">LINE</span>
                <LineStatus entry={entry} />
              </div>
            </div>
          </TableCard>
        ))}
      </TableCardList>
    </div>
  );
}
