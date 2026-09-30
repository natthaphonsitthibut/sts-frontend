import {
  Copy,
  Info,
  Link2,
  LoaderCircle,
  MessageCircle,
  Power,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Avatar,
  Badge,
  Checkbox,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  IconButton,
} from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  TableCard,
  TableCardList,
  type DataTableSortState,
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
  sort?: DataTableSortState;
  onSortChange: (sort: DataTableSortState | undefined) => void;
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

function LinkTeacher({
  onOpenTeacher,
  row,
}: {
  onOpenTeacher?: (teacherId: string) => void;
  row: ClassroomLinkListItem;
}) {
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
      <div className="min-w-0 truncate font-medium text-slate-800">
        {teacherName}
      </div>
    </div>
  );
}

function LinkAssignment({
  onShowRooms,
  row,
}: {
  onShowRooms: (row: ClassroomLinkListItem) => void;
  row: ClassroomLinkListItem;
}) {
  if (row.assignedClassroomId) {
    return <span>{row.assignedClassroomLabel ?? "1 ห้อง"}</span>;
  }
  if (row.classroomCount === 0) {
    return <span className="text-slate-500">ยังไม่มีห้องที่มอบหมาย</span>;
  }
  return (
    <div className="flex items-center gap-1.5">
      <span>{row.classroomCount} ห้อง</span>
      <IconButton
        aria-label={`ดูชั้นและห้องที่มอบหมายให้ ${row.teacherName ?? "ครู"}`}
        icon={Info}
        onClick={() => onShowRooms(row)}
        variant="view"
      />
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
  | "rows"
  | "selected"
  | "onSelectionChange"
  | "onOpenTeacher"
  | "sort"
  | "onSortChange"
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
  const [roomDetails, setRoomDetails] = useState<ClassroomLinkListItem | null>(
    null,
  );
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
          { label: "ครู", sortKey: "teacherName" },
          { label: "การมอบหมาย", sortKey: "classroomCount" },
          {
            label: "สถานะลิงก์",
            sortKey: "linkStatus",
            className: "text-center",
          },
          {
            label: "สถานะ LINE",
            sortKey: "lineStatus",
            className: "text-center",
          },
          { isAction: true, label: "เครื่องมือ" },
        ]}
        columnWidths={[
          "w-[4%]",
          "w-[22%]",
          "w-[16%]",
          "w-[14%]",
          "w-[20%]",
          "w-[24%]",
        ]}
        sort={props.sort}
        onSortChange={props.onSortChange}
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
            <DataTableCell>
              <LinkAssignment onShowRooms={setRoomDetails} row={row} />
            </DataTableCell>
            <DataTableCell className="text-center">
              {linkStatus(row.status)}
            </DataTableCell>
            <DataTableCell className="text-center">
              <div className="space-y-1">
                {deliveryStatus(row.lineDelivery)}
                {row.lineDelivery?.deliveredAt ? (
                  <div className="text-xs text-slate-500">
                    {formatThaiDateTime(row.lineDelivery.deliveredAt)}
                  </div>
                ) : null}
              </div>
            </DataTableCell>
            <DataTableCell className="text-right">
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
                <div className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                  <span>การมอบหมาย:</span>
                  <LinkAssignment onShowRooms={setRoomDetails} row={row} />
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
      <Dialog
        onOpenChange={(open) => !open && setRoomDetails(null)}
        open={Boolean(roomDetails)}
      >
        <DialogContent
          className="max-w-md"
          onClose={() => setRoomDetails(null)}
        >
          <DialogHeader>
            <DialogTitle icon={Info}>ชั้นและห้องที่มอบหมาย</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">{roomDetails?.teacherName}</p>
          <ul className="max-h-72 space-y-2 overflow-y-auto text-sm text-slate-800">
            {roomDetails?.classrooms
              .slice()
              .sort((a, b) =>
                a.label.localeCompare(b.label, "th", { numeric: true }),
              )
              .map((classroom) => (
                <li
                  className="rounded-md bg-slate-50 px-3 py-2"
                  key={classroom.classroomId}
                >
                  {classroom.label}
                </li>
              ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
