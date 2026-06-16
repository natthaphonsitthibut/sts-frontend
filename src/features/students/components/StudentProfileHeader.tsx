import { useState } from "react";
import { Eye, MapPin, Phone, UserRound } from "lucide-react";
import { Button, Card, IconButton } from "../../../components/base";
import type {
  StudentDetail,
  StudentPiiField,
  StudentPiiRevealResponse,
} from "../types/students.types";
import { StudentPiiRevealDialog } from "./StudentPiiRevealDialog";

interface StudentProfileHeaderProps {
  student: StudentDetail;
  studentId: string;
}

const PII_FIELDS: StudentPiiField[] = ["PersonID_Onec", "PassportNumber_Onec"];

const PII_FIELD_LABELS: Record<StudentPiiField, string> = {
  PersonID_Onec: "เลขบัตรประชาชน",
  PassportNumber_Onec: "เลขหนังสือเดินทาง",
};

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 text-center">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="text-base font-bold text-slate-800">{value}</div>
    </div>
  );
}

function toDisplay(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  return String(value);
}

export function StudentProfileHeader({
  student,
  studentId,
}: StudentProfileHeaderProps) {
  const [revealField, setRevealField] = useState<StudentPiiField | null>(null);
  const [revealedValues, setRevealedValues] = useState<
    Partial<Record<StudentPiiField, string>>
  >({});
  const fullName =
    `${student.FirstName_Onec ?? ""} ${student.LastName_Onec ?? ""}`.trim() ||
    "ไม่ระบุชื่อ";
  const maskedFields = student.masked_fields ?? [];

  function isMasked(field: StudentPiiField): boolean {
    return maskedFields.includes(field) && revealedValues[field] === undefined;
  }

  function getFieldValue(field: StudentPiiField): string {
    return toDisplay(revealedValues[field] ?? student[field]);
  }

  function handleRevealed(values: StudentPiiRevealResponse["values"]): void {
    setRevealedValues((current) => {
      const next = { ...current };
      for (const field of PII_FIELDS) {
        if (typeof values[field] === "string") {
          next[field] = values[field];
        }
      }
      return next;
    });
  }

  function renderPiiField(field: StudentPiiField) {
    const masked = isMasked(field);

    return (
      <div>
        {PII_FIELD_LABELS[field]}:{" "}
        <span className="font-medium text-slate-800">
          {getFieldValue(field)}
        </span>
        {masked ? (
          <Button
            className="ml-2 align-middle"
            icon={Eye}
            onClick={() => setRevealField(field)}
            size="sm"
            type="button"
            variant="ghost"
          >
            แสดง
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <Card className="mb-6 p-6">
        <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
          <div className="flex size-[110px] shrink-0 items-center justify-center rounded-full bg-slate-200 shadow-md">
            <UserRound className="size-20 text-slate-500" aria-hidden="true" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
              <div className="w-full text-center md:text-left">
                <h1 className="text-2xl font-bold text-slate-800">
                  {fullName}
                </h1>
                <div className="mt-2 flex flex-col gap-1 text-sm text-slate-500 sm:flex-row sm:flex-wrap sm:gap-x-6">
                  <div>
                    รหัสโรงเรียน:{" "}
                    <span className="font-medium text-slate-800">
                      {toDisplay(student.SchoolID_Onec)}
                    </span>
                  </div>
                  {renderPiiField("PersonID_Onec")}
                  {student.PassportNumber_Onec !== undefined ||
                  maskedFields.includes("PassportNumber_Onec")
                    ? renderPiiField("PassportNumber_Onec")
                    : null}
                  <div>
                    ชั้นเรียน:{" "}
                    <span className="font-medium text-slate-800">
                      {toDisplay(student.grade)} ห้อง {toDisplay(student.room)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-center md:self-start">
                <Button>ประเมิน SDQ</Button>
                <IconButton
                  aria-label="โทรหานักเรียน"
                  className="bg-slate-100 text-slate-600"
                  icon={Phone}
                  variant="ghost"
                />
                <IconButton
                  aria-label="ดูที่อยู่"
                  className="bg-slate-100 text-slate-600"
                  icon={MapPin}
                  variant="ghost"
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard
                label="ปีการศึกษา"
                value={toDisplay(student.AcademicYear_Onec)}
              />
              <StatCard
                label="ภาคเรียน"
                value={toDisplay(student.Semester_Onec)}
              />
              <StatCard label="GPAX" value={toDisplay(student.GPAX_Onec)} />
            </div>
          </div>
        </div>
      </Card>

      <StudentPiiRevealDialog
        field={revealField}
        maskedValue={revealField ? getFieldValue(revealField) : ""}
        onOpenChange={(open) => {
          if (!open) {
            setRevealField(null);
          }
        }}
        onRevealed={handleRevealed}
        open={revealField !== null}
        studentId={studentId}
      />
    </>
  );
}
