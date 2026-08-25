import { Eye, SquarePen, Trash2 } from "lucide-react";
import { Avatar, Button, IconButton } from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  type DataTableSortState,
  TableCard,
  TableCardList,
} from "../../../components/layout/data-table";
import { resolveApiMediaUrl } from "../../../lib/media-url";
import type { TeacherDirectoryItem } from "../types/teachers.types";

interface TeacherTableProps {
  teachers: TeacherDirectoryItem[];
  /** 1-based index of the first row on the current page, for the ลำดับ column. */
  startIndex: number;
  management?: boolean;
  onView: (teacher: TeacherDirectoryItem) => void;
  onRevealNationalId: (teacher: TeacherDirectoryItem) => void;
  revealedNationalIds?: Record<string, string>;
  onEdit?: (teacher: TeacherDirectoryItem) => void;
  onDeactivate?: (teacher: TeacherDirectoryItem) => void;
  deactivatingTeacherId?: string | null;
  sort?: DataTableSortState;
  onSortChange: (sort: DataTableSortState | undefined) => void;
}

/**
 * Same treatment as the classroom roster: a photo when one is set, otherwise the
 * shared per-name colour gradient, and a hover/focus ring since it opens the
 * teacher's record.
 */
function TeacherAvatarButton({
  teacher,
  onView,
}: {
  teacher: TeacherDirectoryItem;
  onView: (teacher: TeacherDirectoryItem) => void;
}) {
  return (
    <button
      aria-label={`เปิดข้อมูลคุณครู ${teacher.fullName}`}
      className="rounded-full transition-shadow hover:ring-2 hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      onClick={() => onView(teacher)}
      type="button"
    >
      <Avatar
        gradientName={teacher.fullName}
        imageAlt={`รูปประจำตัวของ ${teacher.fullName}`}
        imageUrl={resolveApiMediaUrl(teacher.photoUrl)}
      />
    </button>
  );
}

function RowActions({
  teacher,
  onEdit,
  onDeactivate,
  deactivatingTeacherId,
}: Pick<
  TeacherTableProps,
  "onEdit" | "onDeactivate" | "deactivatingTeacherId"
> & {
  teacher: TeacherDirectoryItem;
}) {
  const isDeactivating = deactivatingTeacherId === teacher.id;
  if (!onEdit || !onDeactivate) return null;
  return (
    <div className="flex items-center justify-end gap-1">
      <IconButton
        aria-label={`แก้ไขข้อมูลของ ${teacher.fullName}`}
        disabled={isDeactivating}
        icon={SquarePen}
        onClick={() => onEdit(teacher)}
        variant="edit"
      />
      <IconButton
        aria-busy={isDeactivating}
        aria-label={`ปิดใช้งาน ${teacher.fullName}`}
        disabled={isDeactivating}
        icon={Trash2}
        onClick={() => onDeactivate(teacher)}
        variant="delete"
      />
    </div>
  );
}

export function TeacherTable({
  teachers,
  startIndex,
  management = false,
  onView,
  onRevealNationalId,
  revealedNationalIds = {},
  onEdit,
  onDeactivate,
  deactivatingTeacherId,
  sort,
  onSortChange,
}: TeacherTableProps) {
  return (
    <div className="flex flex-col gap-2">
      <DataTable
        headings={[
          "ลำดับ",
          "รูปประจำตัว",
          { label: "ชื่อ-นามสกุล", sortKey: "name" },
          { label: "เลขบัตรประชาชน", sortKey: "citizenId" },
          { label: "เบอร์โทรศัพท์", sortKey: "phone" },
          { label: "ไอดีไลน์", sortKey: "lineId" },
          { label: "อีเมล", sortKey: "email" },
          ...(management ? ["เครื่องมือ"] : []),
        ]}
        columnWidths={[
          "w-[7%]",
          "w-[9%]",
          "w-[19%]",
          "w-[15%]",
          "w-[13%]",
          "w-[13%]",
          "w-[16%]",
          "w-[8%]",
        ]}
        minWidthClassName="min-w-[1080px]"
        onSortChange={onSortChange}
        sort={sort}
      >
        {teachers.map((teacher, index) => (
          <DataTableRow key={teacher.id}>
            <DataTableCell>{startIndex + index}</DataTableCell>
            <DataTableCell>
              <div className="flex justify-center">
                <TeacherAvatarButton onView={onView} teacher={teacher} />
              </div>
            </DataTableCell>
            <DataTableCell className="text-slate-800">
              {teacher.fullName}
            </DataTableCell>
            <DataTableCell>
              <div className="flex items-center gap-2">
                <span>
                  {revealedNationalIds[teacher.id] ?? teacher.citizenId ?? "-"}
                </span>
                {teacher.citizenId ? (
                  <Button
                    aria-label={`แสดงเลขบัตรประชาชนของ ${teacher.fullName}`}
                    icon={Eye}
                    onClick={() => onRevealNationalId(teacher)}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    แสดง
                  </Button>
                ) : null}
              </div>
            </DataTableCell>
            <DataTableCell>{teacher.phone || "-"}</DataTableCell>
            <DataTableCell>{teacher.lineId || "-"}</DataTableCell>
            <DataTableCell className="truncate">
              {teacher.email || "-"}
            </DataTableCell>
            {management ? (
              <DataTableCell>
                <RowActions
                  deactivatingTeacherId={deactivatingTeacherId}
                  onDeactivate={onDeactivate}
                  onEdit={onEdit}
                  teacher={teacher}
                />
              </DataTableCell>
            ) : null}
          </DataTableRow>
        ))}
      </DataTable>

      <TableCardList>
        {teachers.map((teacher) => (
          <TableCard key={teacher.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <TeacherAvatarButton onView={onView} teacher={teacher} />
                <div className="min-w-0">
                  <div className="truncate text-slate-800">
                    {teacher.fullName}
                  </div>
                  <div className="truncate text-xs text-slate-500">
                    {teacher.citizenId || "ไม่มีเลขบัตรประชาชน"}
                  </div>
                </div>
              </div>
              {management ? (
                <RowActions
                  deactivatingTeacherId={deactivatingTeacherId}
                  onDeactivate={onDeactivate}
                  onEdit={onEdit}
                  teacher={teacher}
                />
              ) : null}
            </div>
            <dl className="mt-3 grid grid-cols-1 gap-1 rounded-md bg-slate-50 p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">เลขบัตรประชาชน</dt>
                <dd className="flex items-center gap-2 text-slate-700">
                  <span>
                    {revealedNationalIds[teacher.id] ??
                      teacher.citizenId ??
                      "-"}
                  </span>
                  {teacher.citizenId ? (
                    <Button
                      aria-label={`แสดงเลขบัตรประชาชนของ ${teacher.fullName}`}
                      icon={Eye}
                      onClick={() => onRevealNationalId(teacher)}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      แสดง
                    </Button>
                  ) : null}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">เบอร์โทรศัพท์</dt>
                <dd className="text-slate-700">{teacher.phone || "-"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">ไอดีไลน์</dt>
                <dd className="text-slate-700">{teacher.lineId || "-"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">อีเมล</dt>
                <dd className="truncate text-slate-700">
                  {teacher.email || "-"}
                </dd>
              </div>
            </dl>
          </TableCard>
        ))}
      </TableCardList>
    </div>
  );
}
