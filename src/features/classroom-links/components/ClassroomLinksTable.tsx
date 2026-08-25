import { Copy, Link2, MessageCircle, Power, RefreshCw } from "lucide-react";
import { Avatar, Badge, Button, Checkbox } from "../../../components/base";
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
import { formatClassLabel } from "../../../lib/room-presentation";

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
    return <Badge variant="warning">ยังไม่มีครูประจำชั้น</Badge>;
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

function HomeroomTeacher({
  onOpenTeacher,
  row,
}: {
  onOpenTeacher?: (teacherId: string) => void;
  row: ClassroomLinkListItem;
}) {
  if (!row.homeroomTeacherName) {
    return <span className="text-slate-500">ยังไม่ได้กำหนดครูประจำชั้น</span>;
  }
  const avatar = (
    <Avatar
      gradientName={row.homeroomTeacherName}
      imageAlt={`รูปประจำตัวของ ${row.homeroomTeacherName}`}
      imageUrl={resolveApiMediaUrl(row.homeroomTeacherPhotoUrl)}
    />
  );
  const canOpenTeacher = Boolean(row.homeroomTeacherId && onOpenTeacher);
  return (
    <div className="flex min-w-0 items-center gap-3" data-homeroom-teacher>
      {canOpenTeacher ? (
        <button
          aria-label={`เปิดข้อมูลคุณครู ${row.homeroomTeacherName}`}
          className="shrink-0 rounded-full transition-shadow hover:ring-2 hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          onClick={() => onOpenTeacher?.(row.homeroomTeacherId!)}
          type="button"
        >
          {avatar}
        </button>
      ) : (
        <span className="shrink-0 rounded-full transition-shadow hover:ring-2 hover:ring-slate-300">
          {avatar}
        </span>
      )}
      <span className="min-w-0 font-medium text-slate-800">
        {row.homeroomTeacherName}
      </span>
    </div>
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
    String(pending.id) === String(row.id ?? row.classroomId);
  if (row.status !== "ACTIVE" || !row.id) {
    return (
      <Button
        icon={Link2}
        isLoading={isPending("create")}
        onClick={() => onCreate(row)}
        size="sm"
      >
        สร้างลิงก์
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button
        icon={Copy}
        isLoading={isPending("copy")}
        onClick={() => onCopy(row)}
        size="sm"
        variant="outline"
      >
        คัดลอก
      </Button>
      <Button
        disabled={!row.lineDelivery?.canRetry}
        icon={MessageCircle}
        isLoading={isPending("line")}
        onClick={() => onResendLine(row)}
        size="sm"
        variant="outline"
      >
        ส่ง LINE
      </Button>
      <Button
        icon={RefreshCw}
        isLoading={isPending("rotate")}
        onClick={() => onRotate(row)}
        size="sm"
        variant="outline"
      >
        สร้างลิงก์ใหม่
      </Button>
      <Button
        icon={Power}
        isLoading={isPending("deactivate")}
        onClick={() => onDeactivate(row)}
        size="sm"
        variant="destructive"
      >
        ปิด
      </Button>
    </div>
  );
}

export function ClassroomLinksTable(props: ClassroomLinksTableProps) {
  const { onOpenTeacher, rows, selected, onSelectionChange } = props;
  const selectable = rows.filter((row) => row.status !== "ACTIVE");
  const allSelected =
    selectable.length > 0 &&
    selectable.every((row) => selected.has(row.classroomId));

  function toggleAll(checked: boolean): void {
    const next = new Set(selected);
    for (const row of selectable) {
      if (checked) next.add(row.classroomId);
      else next.delete(row.classroomId);
    }
    onSelectionChange(next);
  }

  function toggleOne(classroomId: number, checked: boolean): void {
    const next = new Set(selected);
    if (checked) next.add(classroomId);
    else next.delete(classroomId);
    onSelectionChange(next);
  }

  return (
    <>
      <DataTable
        headings={[
          {
            label: (
              <Checkbox
                aria-label="เลือกห้องที่ยังไม่มีลิงก์ทั้งหมดในหน้านี้"
                checked={allSelected}
                disabled={selectable.length === 0}
                onChange={(event) => toggleAll(event.target.checked)}
              />
            ),
          },
          "ชั้น",
          "ห้อง",
          "ครูประจำชั้น",
          "สถานะลิงก์",
          "สถานะ LINE",
          "เครื่องมือ",
        ]}
        minWidthClassName="min-w-[1080px]"
        responsiveBreakpoint="lg"
      >
        {rows.map((row) => (
          <DataTableRow key={row.classroomId}>
            <DataTableCell className="w-14 text-center">
              <Checkbox
                aria-label={`เลือก ${formatClassLabel(row.gradeLabel, row.roomNumber)}`}
                checked={selected.has(row.classroomId)}
                disabled={row.status === "ACTIVE"}
                onChange={(event) =>
                  toggleOne(row.classroomId, event.target.checked)
                }
              />
            </DataTableCell>
            <DataTableCell className="font-semibold text-slate-900">
              {row.gradeLabel}
            </DataTableCell>
            <DataTableCell>
              <div className="font-semibold text-slate-900">
                {row.roomNumber}
              </div>
              {row.roomName ? (
                <div className="mt-0.5 text-xs text-slate-500">
                  {row.roomName}
                </div>
              ) : null}
            </DataTableCell>
            <DataTableCell>
              <HomeroomTeacher onOpenTeacher={onOpenTeacher} row={row} />
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
            <DataTableCell className="min-w-[360px] text-right">
              <RowActions row={row} {...props} />
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTable>

      <TableCardList desktopBreakpoint="lg">
        {rows.map((row) => (
          <TableCard key={row.classroomId}>
            <div className="flex items-start gap-3">
              <Checkbox
                aria-label={`เลือก ${formatClassLabel(row.gradeLabel, row.roomNumber)}`}
                checked={selected.has(row.classroomId)}
                disabled={row.status === "ACTIVE"}
                onChange={(event) =>
                  toggleOne(row.classroomId, event.target.checked)
                }
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-base font-bold text-slate-900">
                    {formatClassLabel(row.gradeLabel, row.roomNumber)}
                  </div>
                  {linkStatus(row.status)}
                </div>
                <div className="mt-2 text-sm">
                  <HomeroomTeacher onOpenTeacher={onOpenTeacher} row={row} />
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
