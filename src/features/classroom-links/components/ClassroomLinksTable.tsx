import {
  Copy,
  Link2,
  LoaderCircle,
  MessageCircle,
  Power,
  RefreshCw,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Avatar, Badge, Checkbox, IconButton } from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  TableCard,
  TableCardList,
} from "../../../components/layout/data-table";
import type {
  ClassroomLinkDelivery,
  ClassroomLinkListItem,
} from "../types/classroom-links.types";
import { formatThaiDateTime } from "../../../lib/date-time";
import { resolveApiMediaUrl } from "../../../lib/media-url";

interface ClassroomLinksTableProps {
  rows: ClassroomLinkListItem[];
  selected: Set<number>;
  pending?: { action: string; id: string | number } | null;
  onSelectionChange: (next: Set<number>) => void;
  onCreate: (row: ClassroomLinkListItem) => void;
  onCopy: (row: ClassroomLinkListItem) => void;
  onResendLine: (row: ClassroomLinkListItem) => void;
  onRotate: (row: ClassroomLinkListItem) => void;
  onDeactivate: (row: ClassroomLinkListItem) => void;
  onOpenTeacher?: (teacherId: string) => void;
}

function linkStatus(status: ClassroomLinkListItem["status"]) {
  if (status === "ACTIVE") return <Badge variant="success">ใช้งานอยู่</Badge>;
  if (status === "INACTIVE")
    return <Badge variant="secondary">ปิดใช้งาน</Badge>;
  return <Badge variant="warning">ยังไม่ได้สร้าง</Badge>;
}

function deliveryStatus(delivery: ClassroomLinkDelivery | null) {
  if (!delivery) return <span className="text-slate-400">รอสร้างลิงก์</span>;
  if (!delivery.recipientTeacherMembershipId) {
    return <Badge variant="warning">ยังไม่มีผู้รับ</Badge>;
  }
  if (delivery.accountState === "NOT_VERIFIED") {
    return <Badge variant="warning">ยังไม่ยืนยัน LINE</Badge>;
  }
  if (delivery.status === "SENT")
    return <Badge variant="success">ส่งสำเร็จ</Badge>;
  if (delivery.status === "SENDING") return <Badge>กำลังส่ง</Badge>;
  if (delivery.status === "FAILED")
    return <Badge variant="destructive">ส่งไม่สำเร็จ</Badge>;
  if (delivery.status === "NEEDS_RESEND")
    return <Badge variant="warning">ควรส่งลิงก์ใหม่</Badge>;
  if (delivery.accountState !== "FRIEND")
    return <Badge variant="warning">ติดต่อผ่าน LINE ไม่ได้</Badge>;
  return <Badge variant="secondary">ยังไม่ได้ส่ง</Badge>;
}

/**
 * The teacher a link belongs to, with the rooms it opens onto.
 *
 * The link used to be a room's, so the row showed that room's homeroom teacher.
 * It is the teacher's now, and the rooms are whatever their subjects reach —
 * shown as a count with the names behind it, because a teacher with eight rooms
 * would otherwise push every other column off the line.
 */
/**
 * Who the link is for: a teacher and the rooms their subjects reach, or — for
 * an assignment — the single room it covers and how long it lasts.
 *
 * Both shapes share the row because both are links to the same workspace; what
 * differs is who may pick it up, and that reads best as one line of text rather
 * than a second table.
 */
function LinkTeacher({
  onOpenTeacher,
  row,
}: {
  onOpenTeacher?: (teacherId: string) => void;
  row: ClassroomLinkListItem;
}) {
  if (row.assignedClassroomId) {
    return (
      <div className="min-w-0" data-link-assignment>
        <div className="truncate font-medium text-slate-800">
          มอบหมาย · {row.assignedClassroomLabel ?? "ห้องเรียน"}
        </div>
        <div className="truncate text-xs text-slate-500">
          {row.expiresAt
            ? `ถึง ${formatThaiDateTime(row.expiresAt)}`
            : "ไม่มีกำหนดสิ้นสุด"}
          {row.assignmentNote ? ` · ${row.assignmentNote}` : ""}
        </div>
      </div>
    );
  }
  const teacherName = row.teacherName ?? "ไม่ทราบชื่อ";
  const avatar = (
    <Avatar
      gradientName={teacherName}
      imageAlt={`รูปประจำตัวของ ${teacherName}`}
      imageUrl={resolveApiMediaUrl(row.teacherPhotoUrl)}
    />
  );
  return (
    <div className="flex min-w-0 items-center gap-2" data-link-teacher>
      {onOpenTeacher && row.teacherId ? (
        <button
          aria-label={`เปิดข้อมูลคุณครู ${teacherName}`}
          className="shrink-0 rounded-full transition-shadow hover:ring-2 hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          onClick={() => onOpenTeacher(row.teacherId as string)}
          type="button"
        >
          {avatar}
        </button>
      ) : (
        <span className="shrink-0 rounded-full">{avatar}</span>
      )}
      <div className="min-w-0">
        <div className="truncate font-medium text-slate-800">{teacherName}</div>
        {/* The count, not the list: nine room labels pushed every other
            column off the line and nobody reads them in a table. */}
        <div className="truncate text-xs text-slate-500">
          {row.classroomCount > 0
            ? `${row.classroomCount} ห้อง`
            : "ยังไม่ได้กำหนดวิชาให้ครูคนนี้"}
        </div>
      </div>
    </div>
  );
}

function ActionIconButton({
  busy = false,
  disabled = false,
  icon,
  label,
  onClick,
  spinOwnIcon = false,
  variant,
}: {
  busy?: boolean;
  disabled?: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  spinOwnIcon?: boolean;
  variant: "share" | "contact" | "credential" | "lock" | "view";
}) {
  return (
    <IconButton
      aria-busy={busy}
      aria-label={label}
      disabled={disabled || busy}
      icon={busy && !spinOwnIcon ? LoaderCircle : icon}
      iconClassName={busy ? "animate-spin" : undefined}
      onClick={onClick}
      title={label}
      variant={variant}
    />
  );
}

function RowActions({
  row,
  pending,
  onCreate,
  onCopy,
  onResendLine,
  onRotate,
  onDeactivate,
}: Omit<
  ClassroomLinksTableProps,
  "rows" | "selected" | "onSelectionChange" | "onOpenTeacher"
> & {
  row: ClassroomLinkListItem;
}) {
  const isPending = (action: string) =>
    pending?.action === action &&
    String(pending.id) === String(row.id ?? row.teacherMembershipId);
  if (row.status !== "ACTIVE" || !row.id) {
    return (
      <div className="flex justify-end">
        <ActionIconButton
          busy={isPending("create")}
          icon={Link2}
          label="สร้างลิงก์"
          onClick={() => onCreate(row)}
          variant="view"
        />
      </div>
    );
  }
  return (
    <div className="flex justify-end gap-1.5">
      <ActionIconButton
        busy={isPending("copy")}
        icon={Copy}
        label="คัดลอกลิงก์"
        onClick={() => onCopy(row)}
        variant="share"
      />
      <ActionIconButton
        busy={isPending("line")}
        disabled={!row.lineDelivery?.canRetry}
        icon={MessageCircle}
        label="ส่งลิงก์ผ่าน LINE"
        onClick={() => onResendLine(row)}
        variant="contact"
      />
      <ActionIconButton
        busy={isPending("rotate")}
        icon={RefreshCw}
        label="สร้างลิงก์ใหม่"
        onClick={() => onRotate(row)}
        spinOwnIcon
        variant="credential"
      />
      <ActionIconButton
        busy={isPending("deactivate")}
        icon={Power}
        label="ปิดลิงก์"
        onClick={() => onDeactivate(row)}
        variant="lock"
      />
    </div>
  );
}

export function ClassroomLinksTable(props: ClassroomLinksTableProps) {
  const { onOpenTeacher, rows, selected, onSelectionChange } = props;
  const selectable = rows.filter(
    (row) => row.status !== "ACTIVE" && row.teacherMembershipId !== null,
  );
  const allSelected =
    selectable.length > 0 &&
    selectable.every((row) => selected.has(row.teacherMembershipId ?? -1));

  function toggleAll(checked: boolean): void {
    const next = new Set(selected);
    for (const row of selectable) {
      if (row.teacherMembershipId === null) continue;
      if (checked) next.add(row.teacherMembershipId);
      else next.delete(row.teacherMembershipId);
    }
    onSelectionChange(next);
  }

  function toggleOne(teacherMembershipId: number, checked: boolean): void {
    const next = new Set(selected);
    if (checked) next.add(teacherMembershipId);
    else next.delete(teacherMembershipId);
    onSelectionChange(next);
  }

  return (
    <>
      <DataTable
        headings={[
          {
            label: (
              <Checkbox
                aria-label="เลือกครูที่ยังไม่มีลิงก์ทั้งหมดในหน้านี้"
                checked={allSelected}
                disabled={selectable.length === 0}
                onChange={(event) => toggleAll(event.target.checked)}
              />
            ),
          },
          "ครู / การมอบหมาย",
          "สถานะลิงก์",
          "สถานะ LINE",
          "เครื่องมือ",
        ]}
        columnWidths={["w-[4%]", "w-[42%]", "w-[16%]", "w-[20%]", "w-[18%]"]}
        // Sized to fit the content column rather than to a round number: the
        // เครื่องมือ column holds four icon buttons and had been given 30% of
        // 1200px, which pushed the table wider than the page could hold and
        // left it scrolling sideways under the sidebar. At 900px it fits the
        // `xl` viewport it appears on; below that the cards take over.
        minWidthClassName="min-w-[900px]"
        responsiveBreakpoint="xl"
      >
        {rows.map((row) => (
          <DataTableRow
            key={row.id ?? row.teacherMembershipId ?? row.assignedClassroomId}
          >
            <DataTableCell className="w-14 text-center">
              <Checkbox
                aria-label={`เลือก ${row.teacherName}`}
                checked={selected.has(row.teacherMembershipId ?? -1)}
                disabled={
                  row.status === "ACTIVE" || row.teacherMembershipId === null
                }
                onChange={(event) =>
                  toggleOne(row.teacherMembershipId ?? -1, event.target.checked)
                }
              />
            </DataTableCell>
            <DataTableCell>
              <LinkTeacher onOpenTeacher={onOpenTeacher} row={row} />
            </DataTableCell>
            <DataTableCell>{linkStatus(row.status)}</DataTableCell>
            <DataTableCell>
              <div className="space-y-1">
                {deliveryStatus(row.lineDelivery)}
                {row.lineDelivery?.deliveredAt ? (
                  <div className="text-xs text-slate-500">
                    {formatThaiDateTime(row.lineDelivery.deliveredAt)}
                  </div>
                ) : null}
              </div>
            </DataTableCell>
            <DataTableCell className="min-w-[300px] text-right">
              <RowActions row={row} {...props} />
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTable>

      <TableCardList desktopBreakpoint="xl">
        {rows.map((row) => (
          <TableCard
            key={row.id ?? row.teacherMembershipId ?? row.assignedClassroomId}
          >
            <div className="flex items-start gap-3">
              <Checkbox
                aria-label={`เลือก ${row.teacherName}`}
                checked={selected.has(row.teacherMembershipId ?? -1)}
                disabled={
                  row.status === "ACTIVE" || row.teacherMembershipId === null
                }
                onChange={(event) =>
                  toggleOne(row.teacherMembershipId ?? -1, event.target.checked)
                }
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <LinkTeacher onOpenTeacher={onOpenTeacher} row={row} />
                  {linkStatus(row.status)}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {deliveryStatus(row.lineDelivery)}
                </div>
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <RowActions row={row} {...props} />
                </div>
              </div>
            </div>
          </TableCard>
        ))}
      </TableCardList>
    </>
  );
}
