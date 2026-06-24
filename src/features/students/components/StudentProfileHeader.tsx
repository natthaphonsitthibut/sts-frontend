import { useState } from "react";
import { Eye, EyeOff, MapPin, Phone, UserRound } from "lucide-react";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  IconButton,
} from "../../../components/base";
import { getApiErrorMessage } from "../../../lib/api-error";
import { studentsService } from "../api/students.service";
import {
  PII_FIELDS,
  PII_FIELD_GROUPS,
  PII_FIELD_LABELS,
} from "../pii.constants";
import type {
  StudentDetail,
  StudentPiiField,
  StudentPiiRevealResponse,
} from "../types/students.types";
import { StudentPiiRevealDialog } from "./StudentPiiRevealDialog";

// "reasoned" = staff reveal: collect a reason via the dialog (audited with that
// reason). "direct" = data-subject self-reveal: the student views their own id
// with no reason prompt — the backend waives it and logs SELF_ACCESS.
type PiiRevealMode = "reasoned" | "direct";

interface StudentProfileHeaderProps {
  student: StudentDetail;
  studentId: string;
  piiRevealMode?: PiiRevealMode;
}

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
  piiRevealMode = "reasoned",
}: StudentProfileHeaderProps) {
  const [revealField, setRevealField] = useState<StudentPiiField | null>(null);
  const [revealedValues, setRevealedValues] = useState<
    Partial<Record<StudentPiiField, string>>
  >({});
  const [directRevealing, setDirectRevealing] =
    useState<StudentPiiField | null>(null);
  const [directError, setDirectError] = useState("");
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

  // Re-mask a previously revealed field within the session (no server call —
  // the reveal was already audited). Keeps the toggle button in place so the
  // row does not shift between masked/revealed states.
  function handleHide(field: StudentPiiField): void {
    setRevealedValues((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  // Self-reveal: no reason dialog. Call the reveal endpoint directly; the
  // backend records SELF_ACCESS. One in-flight field at a time.
  async function handleDirectReveal(field: StudentPiiField): Promise<void> {
    setDirectError("");
    setDirectRevealing(field);
    try {
      const response = await studentsService.revealStudentPii(studentId, {
        field_group: PII_FIELD_GROUPS[field],
      });
      handleRevealed(response.values);
    } catch (error) {
      setDirectError(
        getApiErrorMessage(error, "ไม่สามารถแสดงข้อมูลได้ กรุณาลองอีกครั้ง"),
      );
    } finally {
      setDirectRevealing(null);
    }
  }

  function handleRevealClick(field: StudentPiiField): void {
    if (piiRevealMode === "direct") {
      void handleDirectReveal(field);
      return;
    }
    setRevealField(field);
  }

  function renderPiiField(field: StudentPiiField) {
    const maskable = maskedFields.includes(field);
    const masked = isMasked(field);

    return (
      <div>
        {PII_FIELD_LABELS[field]}:{" "}
        <span className="font-mono font-medium tabular-nums text-slate-800">
          {getFieldValue(field)}
        </span>
        {maskable ? (
          masked ? (
            <Button
              className="ml-2 align-middle"
              disabled={directRevealing !== null}
              icon={Eye}
              isLoading={directRevealing === field}
              loadingText="กำลังแสดง"
              onClick={() => handleRevealClick(field)}
              size="sm"
              type="button"
              variant="ghost"
            >
              แสดง
            </Button>
          ) : (
            <Button
              className="ml-2 align-middle"
              icon={EyeOff}
              onClick={() => handleHide(field)}
              size="sm"
              type="button"
              variant="ghost"
            >
              ซ่อน
            </Button>
          )
        ) : null}
      </div>
    );
  }

  return (
    <>
      <Card className="mb-6 p-6">
        {directError ? (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{directError}</AlertDescription>
          </Alert>
        ) : null}
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
                <div className="mt-2 flex flex-col gap-1 text-sm text-slate-500 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-1">
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
