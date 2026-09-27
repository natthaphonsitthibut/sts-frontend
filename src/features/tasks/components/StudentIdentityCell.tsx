import { ContextLink } from "../../../components/layout/context-link";
import { StudentAvatar } from "../../students/components/StudentAvatar";

interface StudentIdentityCellProps {
  canViewStudent: boolean;
  studentId: string | null;
  studentName: string;
  studentPhotoUrl: string | null;
  schoolName: string | null;
}

/**
 * The student column every tab of รายงานสถานะนักเรียน shares: avatar (a link to
 * the profile when the account may open it), name, and school underneath — so
 * กลุ่มเสี่ยง, กลุ่มเฝ้าระวัง and งานส่งต่อ read as one report.
 */
export function StudentIdentityCell({
  canViewStudent,
  studentId,
  studentName,
  studentPhotoUrl,
  schoolName,
}: StudentIdentityCellProps) {
  const avatar = (
    <StudentAvatar
      className="transition-shadow group-hover:ring-2 group-hover:ring-primary/30"
      name={studentName}
      photoUrl={studentPhotoUrl}
    />
  );
  return (
    <div className="flex min-w-0 items-center gap-3">
      {canViewStudent && studentId ? (
        <ContextLink
          aria-label={`ดูโปรไฟล์ ${studentName}`}
          className="group shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          to={`/students/${studentId}`}
        >
          {avatar}
        </ContextLink>
      ) : (
        <span className="shrink-0">{avatar}</span>
      )}
      <div className="min-w-0">
        <div className="truncate text-slate-800">{studentName}</div>
        <div className="truncate text-xs text-slate-500">
          {schoolName || "ไม่ระบุโรงเรียน"}
        </div>
      </div>
    </div>
  );
}
