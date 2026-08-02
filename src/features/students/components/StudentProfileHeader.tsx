import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Award, ClipboardList, GraduationCap, MapPin, PhoneCall, UserRound } from "lucide-react";
import { getAvatarGradient } from "../../../lib/avatar-gradient";
import {
  Alert,
  AlertDescription,
  Badge,
  Card,
  IconButton,
} from "../../../components/base";
import { SensitiveValueToggleButton } from "../../../components/security/SensitiveValueToggleButton";
import { useTimedSensitiveReveal } from "../../../hooks/useTimedSensitiveReveal";
import { getApiErrorMessage } from "../../../lib/api-error";
import { maskSensitiveIdentifier } from "../../../lib/pii-presentation";
import { formatRoomLabel } from "../../../lib/room-presentation";
import { studentsService } from "../api/students.service";
import { RISK_TIER_PRESENTATION } from "../lib/risk-tier-presentation";
import {
  PII_FIELD_GROUPS,
  PII_FIELD_LABELS,
} from "../pii.constants";
import type {
  StudentDetail,
  StudentProfileSummary,
  StudentPiiField,
  StudentPiiRevealResponse,
} from "../types/students.types";
import { StudentPiiRevealDialog } from "./StudentPiiRevealDialog";

// "reasoned" = staff reveal: collect a reason via the dialog (audited with that
// reason). "direct" = data-subject self-reveal: the student views their own id
// with no reason prompt — the backend waives it and logs SELF_ACCESS.
type PiiRevealMode = "reasoned" | "direct";

interface StudentProfileHeaderProps {
  contactsOpen?: boolean;
  locationOpen?: boolean;
  onOpenContacts?: () => void;
  onOpenLocation?: () => void;
  student: StudentDetail;
  studentId: string;
  piiRevealMode?: PiiRevealMode;
  summary?: StudentProfileSummary;
}

function MetricCard({
  icon: Icon,
  iconClassName,
  iconSurfaceClassName,
  label,
  value,
}: {
  icon: LucideIcon;
  iconClassName: string;
  iconSurfaceClassName: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-h-16 items-center justify-between gap-3 rounded-lg border border-slate-200 px-4 py-3 sm:min-h-20 sm:px-5">
      <div className="min-w-0">
        <div className="text-xs font-medium text-slate-500">{label}</div>
        <div className="mt-0.5 text-2xl font-bold tabular-nums text-slate-950">{value}</div>
      </div>
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${iconSurfaceClassName}`}>
        <Icon className={`size-5 ${iconClassName}`} aria-hidden="true" />
      </span>
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
  contactsOpen = false,
  locationOpen = false,
  onOpenContacts,
  onOpenLocation,
  student,
  studentId,
  piiRevealMode = "reasoned",
  summary,
}: StudentProfileHeaderProps) {
  const [revealField, setRevealField] = useState<StudentPiiField | null>(null);
  const {
    hide,
    reveal,
    showCached,
    values: revealedValues,
    visibleFields,
  } = useTimedSensitiveReveal<StudentPiiField>(studentId);
  const [directRevealing, setDirectRevealing] =
    useState<StudentPiiField | null>(null);
  const [directError, setDirectError] = useState("");
  const fullName =
    `${student.FirstName_Onec ?? ""} ${student.LastName_Onec ?? ""}`.trim() ||
    "ไม่ระบุชื่อ";
  const maskedFields = student.masked_fields ?? [];
  const riskPresentation =
    RISK_TIER_PRESENTATION[student.risk_tier ?? "NORMAL"] ??
    RISK_TIER_PRESENTATION.NORMAL;
  const attendanceRate = summary?.attendance.ratePercent;
  const termGpa = summary?.grades.termGpa ?? student.term_gpa;
  const cumulativeGpax = summary?.grades.cumulativeGpax ?? student.GPAX_Onec;

  function formatMetric(value: unknown, suffix = ""): string {
    const numeric = Number(value);
    return value !== null && value !== undefined && Number.isFinite(numeric)
      ? `${numeric.toFixed(suffix ? 0 : 2)}${suffix}`
      : "—";
  }

  function hasPiiValue(field: StudentPiiField): boolean {
    const value = student[field];
    return maskedFields.includes(field) || (value !== null && value !== undefined && value !== "");
  }

  function isMasked(field: StudentPiiField): boolean {
    return hasPiiValue(field) && visibleFields[field] !== true;
  }

  function getFieldValue(field: StudentPiiField): string {
    const revealedValue = revealedValues[field];
    return visibleFields[field] === true && revealedValue !== undefined
      ? toDisplay(revealedValue)
      : maskSensitiveIdentifier(student[field]) || "-";
  }

  function handleRevealed(values: StudentPiiRevealResponse["values"]): void {
    reveal(values);
  }

  // Re-mask only the presentation. Keep the revealed value in page memory so
  // showing it again before navigation/refresh does not ask for the same reason
  // or create a duplicate audit entry.
  function handleHide(field: StudentPiiField): void {
    hide(field);
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
    if (revealedValues[field] !== undefined) {
      showCached(field);
      return;
    }
    if (piiRevealMode === "direct") {
      void handleDirectReveal(field);
      return;
    }
    setRevealField(field);
  }

  function renderPiiField(field: StudentPiiField) {
    const maskable = hasPiiValue(field);
    const masked = isMasked(field);
    const actionLabel =
      field === "PersonID_Onec" ? "เลขบัตร" : "เลขหนังสือเดินทาง";

    return (
      <div>
        {PII_FIELD_LABELS[field]}:{" "}
        <span className="font-medium tabular-nums text-slate-800">
          {getFieldValue(field)}
        </span>
        {maskable ? (
          <span className="ml-2 inline-flex align-middle">
            <SensitiveValueToggleButton
              disabled={directRevealing !== null}
              isLoading={directRevealing === field}
              isVisible={!masked}
              label={actionLabel}
              onClick={() =>
                masked ? handleRevealClick(field) : handleHide(field)
              }
            />
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <Card className="mb-5 p-5 sm:p-6" data-student-profile-overview>
        {directError ? (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{directError}</AlertDescription>
          </Alert>
        ) : null}
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <UserRound className="size-4 text-primary" aria-hidden="true" />
          ข้อมูลนักเรียน
        </h2>
        <div className="mt-4 flex flex-col items-center gap-5 sm:mt-5 sm:gap-6 md:flex-row md:items-start">
          <div
            className="flex size-28 shrink-0 items-center justify-center rounded-full text-3xl font-extrabold shadow-[0_4px_12px_rgba(0,0,0,0.15)] sm:size-32 sm:text-4xl"
            style={getAvatarGradient(fullName)}
          >
            {fullName.charAt(0).toUpperCase() || "?"}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-col items-start justify-between gap-4 lg:flex-row">
              <div className="w-full text-center md:text-left">
                <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
                  <h1 className="min-w-0 text-xl font-bold leading-8 text-slate-800 sm:text-2xl">
                    {fullName}
                  </h1>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {onOpenContacts ? (
                      <IconButton
                        aria-expanded={contactsOpen}
                        aria-haspopup="dialog"
                        aria-label="ดูเบอร์ติดต่อนักเรียนและผู้ปกครอง"
                        icon={PhoneCall}
                        onClick={onOpenContacts}
                        size="sm"
                        title="ดูเบอร์ติดต่อ"
                        variant="default"
                      />
                    ) : null}
                    {onOpenLocation ? (
                      <IconButton
                        aria-expanded={locationOpen}
                        aria-haspopup="dialog"
                        aria-label="ดูที่อยู่และแผนที่"
                        icon={MapPin}
                        onClick={onOpenLocation}
                        size="sm"
                        title="ดูที่อยู่และแผนที่"
                        variant="default"
                      />
                    ) : null}
                  </div>
                </div>
                <div className="mt-2 flex flex-col gap-1 text-sm text-slate-500 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-1">
                  {renderPiiField("PersonID_Onec")}
                  <div>
                    ระดับชั้น:{" "}
                    <span className="font-medium text-slate-800">
                      {toDisplay(student.grade)} {formatRoomLabel(student.room)}
                    </span>
                  </div>
                  <div>
                    ครูที่ปรึกษา:{" "}
                    <span className="font-medium text-slate-800">
                      {toDisplay(student.homeroom_teacher_name)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-sm">
                <span className="font-medium text-slate-600">สถานะความเสี่ยง:</span>
                <Badge
                  data-student-risk-tier={student.risk_tier ?? "NORMAL"}
                  variant={riskPresentation.badge}
                >
                  {riskPresentation.label}
                </Badge>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:mt-5 sm:grid-cols-3 sm:gap-4">
              <MetricCard
                icon={ClipboardList}
                iconClassName="text-success-700"
                iconSurfaceClassName="bg-success-100"
                label="อัตราการมาเรียน"
                value={formatMetric(attendanceRate, "%")}
              />
              <MetricCard
                icon={Award}
                iconClassName="text-primary"
                iconSurfaceClassName="bg-primary-soft"
                label="เกรดเฉลี่ยเทอมนี้"
                value={formatMetric(termGpa)}
              />
              <MetricCard
                icon={GraduationCap}
                iconClassName="text-violet-700"
                iconSurfaceClassName="bg-violet-100"
                label="เกรดเฉลี่ยรวม"
                value={formatMetric(cumulativeGpax)}
              />
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
