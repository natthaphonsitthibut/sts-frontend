import { useMemo, useState, type ReactNode } from "react";
import { MessageSquareText, UserRound } from "lucide-react";
import { Badge, IconButton } from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  TableCard,
  TableCardList,
} from "../../../components/layout/data-table";
import {
  EmptyState,
  SearchInput,
  ToolbarControls,
} from "../../../components/layout/page-primitives";
import { RISK_TIER_PRESENTATION } from "../../students/lib/risk-tier-presentation";
import type { CheckInStudent } from "../types/check-in.types";

function fullNameOf(student: CheckInStudent): string {
  return `${student.firstName} ${student.lastName}`.trim() || "-";
}

function RiskBadge({ tier }: { tier: string }) {
  const presentation = RISK_TIER_PRESENTATION[tier];
  return (
    <Badge
      data-student-risk-tier={tier}
      variant={presentation?.badge ?? "destructive"}
    >
      {presentation?.label ?? tier}
    </Badge>
  );
}

/**
 * รายชื่อ — the classroom's students as a list, next to the tab that marks
 * them present.
 *
 * Both surfaces render this: the staff เช็กชื่อ page and the classroom link.
 * They differ only in where the two actions lead, which the caller decides, so
 * a teacher sees the same roster whichever door they came through.
 */
export function ClassroomRosterTab({
  isLoading,
  onComment,
  onOpenStudent,
  renderAvatar,
  roster,
}: {
  isLoading: boolean;
  /** Left out where a surface cannot write comments. */
  onComment?: (student: CheckInStudent) => void;
  onOpenStudent: (student: CheckInStudent) => void;
  /** The photo cell, rendered by the surface that knows how to fetch it. */
  renderAvatar: (student: CheckInStudent) => ReactNode;
  roster: CheckInStudent[];
}) {
  const [search, setSearch] = useState("");
  const matches = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return roster;
    return roster.filter((student) =>
      [fullNameOf(student), student.studentNumber ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [roster, search]);

  function avatarButton(student: CheckInStudent) {
    return (
      <button
        aria-label={`เปิดข้อมูลนักเรียน ${fullNameOf(student)}`}
        className="rounded-full transition-shadow hover:ring-2 hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        onClick={() => onOpenStudent(student)}
        type="button"
      >
        {renderAvatar(student)}
      </button>
    );
  }

  function actions(student: CheckInStudent) {
    return (
      <div className="flex justify-center gap-2">
        <IconButton
          aria-label={`ดูข้อมูล ${fullNameOf(student)}`}
          icon={UserRound}
          onClick={() => onOpenStudent(student)}
          variant="edit"
        />
        {onComment ? (
          <IconButton
            aria-label={`เพิ่มความคิดเห็นของ ${fullNameOf(student)}`}
            icon={MessageSquareText}
            onClick={() => onComment(student)}
            variant="comment"
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ToolbarControls>
        <SearchInput
          className="sm:max-w-[560px]"
          onChange={setSearch}
          placeholder="ค้นหาชื่อหรือรหัสประจำตัว"
          value={search}
        />
      </ToolbarControls>

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">
          กำลังเตรียมรายชื่อนักเรียน…
        </div>
      ) : matches.length === 0 ? (
        <EmptyState
          description={
            search.trim()
              ? "ลองเปลี่ยนคำค้นหา"
              : "ห้องเรียนนี้ยังไม่มีนักเรียนที่ใช้งานได้"
          }
          title="ไม่พบรายชื่อนักเรียน"
        />
      ) : (
        <>
          <DataTable
            headings={[
              { label: "ลำดับ" },
              { label: "รูปประจำตัว", className: "text-center" },
              { label: "รหัสประจำตัว" },
              { label: "ชื่อ-นามสกุล" },
              { label: "หมายเหตุ" },
              { label: "สถานะความเสี่ยง", className: "text-center" },
              { label: "เครื่องมือ", className: "text-center" },
            ]}
            minWidthClassName="min-w-[1040px]"
          >
            {matches.map((student, index) => (
              <DataTableRow key={student.id}>
                <DataTableCell className="tabular-nums">
                  {index + 1}
                </DataTableCell>
                <DataTableCell>
                  <div className="flex justify-center">
                    {avatarButton(student)}
                  </div>
                </DataTableCell>
                <DataTableCell className="font-medium tabular-nums">
                  {student.studentNumber ?? "-"}
                </DataTableCell>
                <DataTableCell className="font-medium text-slate-900">
                  {fullNameOf(student)}
                </DataTableCell>
                <DataTableCell className="max-w-[360px] text-slate-700">
                  {student.teacherComment?.trim() || "-"}
                </DataTableCell>
                <DataTableCell className="text-center">
                  <div className="flex justify-center">
                    <RiskBadge tier={student.riskTier} />
                  </div>
                </DataTableCell>
                <DataTableCell>{actions(student)}</DataTableCell>
              </DataTableRow>
            ))}
          </DataTable>

          <TableCardList>
            {matches.map((student, index) => (
              <TableCard key={student.id}>
                <div className="flex items-center gap-3">
                  <span className="w-5 shrink-0 text-center text-sm font-medium tabular-nums text-slate-500">
                    {index + 1}
                  </span>
                  {avatarButton(student)}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-bold text-slate-900">
                      {fullNameOf(student)}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      รหัสประจำตัว{" "}
                      <span className="tabular-nums text-sm">
                        {student.studentNumber ?? "-"}
                      </span>
                    </p>
                  </div>
                  <RiskBadge tier={student.riskTier} />
                </div>
                {student.teacherComment?.trim() ? (
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                    {student.teacherComment}
                  </p>
                ) : null}
                <div className="mt-2.5">{actions(student)}</div>
              </TableCard>
            ))}
          </TableCardList>
        </>
      )}
    </div>
  );
}
