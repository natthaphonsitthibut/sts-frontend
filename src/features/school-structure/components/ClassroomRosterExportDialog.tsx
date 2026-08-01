import { RISK_TIER_PRESENTATION } from "../../students/lib/risk-tier-presentation";
import { schoolStructureService } from "../api/school-structure.service";
import type { RosterExportColumn } from "../lib/classroom-roster-export";
import type { ClassroomRosterStudent } from "../types/school-structure.types";
import { ClassroomTableExportDialog } from "./ClassroomTableExportDialog";

const EXPORT_COLUMNS = [
  { key: "order", label: "ลำดับ" },
  { key: "studentNumber", label: "รหัสประจำตัว" },
  { key: "name", label: "ชื่อ-นามสกุล" },
  { key: "comment", label: "หมายเหตุ" },
  { key: "risk", label: "สถานะความเสี่ยง" },
] as const satisfies readonly RosterExportColumn[];

interface ClassroomRosterExportDialogProps {
  classroomId: number;
  classroomLabel: string;
  open: boolean;
  riskTier?: string;
  search?: string;
  sortBy: "studentNumber" | "name" | "comment" | "status";
  sortDirection: "asc" | "desc";
  onOpenChange: (open: boolean) => void;
}

function toExportRow(student: ClassroomRosterStudent, index: number): Record<string, string> {
  return {
    order: String(index + 1),
    studentNumber: student.studentNumber ?? "-",
    name: `${student.firstName ?? ""} ${student.lastName ?? ""}`.trim() || "-",
    comment: student.teacherComment?.trim() || "-",
    risk: RISK_TIER_PRESENTATION[student.riskTier]?.label ?? student.riskTier,
  };
}

export function ClassroomRosterExportDialog({
  classroomId,
  classroomLabel,
  onOpenChange,
  open,
  riskTier,
  search,
  sortBy,
  sortDirection,
}: ClassroomRosterExportDialogProps) {
  async function loadRows(): Promise<Record<string, string>[]> {
    const first = await schoolStructureService.listRoster({
      classroomId,
      search: search || undefined,
      riskTier: riskTier || undefined,
      page: 1,
      limit: 50,
      sortBy,
      sortDirection,
    });
    const rows = [...first.data];
    for (let page = 2; page <= first.meta.totalPages; page += 1) {
      const next = await schoolStructureService.listRoster({
        classroomId,
        search: search || undefined,
        riskTier: riskTier || undefined,
        page,
        limit: 50,
        sortBy,
        sortDirection,
      });
      rows.push(...next.data);
    }
    return rows.map(toExportRow);
  }

  return (
    <ClassroomTableExportDialog
      authorizeExport={(format, columns) =>
        schoolStructureService.authorizeClassroomExport({
          classroomId,
          exportScope: "ROSTER",
          format,
          columns,
        })
      }
      columns={EXPORT_COLUMNS}
      fileName={`classroom-${classroomLabel.replace("/", "-")}`}
      loadRows={loadRows}
      onOpenChange={onOpenChange}
      open={open}
      title={`รายชื่อนักเรียน ห้อง ${classroomLabel}`}
    />
  );
}
