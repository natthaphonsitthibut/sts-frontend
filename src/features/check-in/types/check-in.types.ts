import type { SchoolClassroom } from "../../school-structure/types/school-structure.types";

export type CheckInAccess = "INTERNAL" | "PUBLIC_LINK";
export type CheckInMarkStatus = "P_PRESENT" | "P_ABSENT" | "P_LATE" | "P_LEAVE";
export type AttendanceExceptionStatus = Exclude<CheckInMarkStatus, "P_PRESENT">;

export interface CheckInContext {
  school: { id: number; name: string };
  term: { id: number; academicYear: number; semester: number };
  /**
   * Every room this link opens onto, in the shape the app's classroom cards
   * use — a teacher link lists the rooms of the subjects they teach, an
   * assignment lists the single room it covers.
   */
  classrooms: Array<
    SchoolClassroom & {
      /** One entry per lesson, so the room repeats when a teacher holds two. */
      classroomSubjectId: number;
      subjectNames: string | null;
      /** Tells two same-named offerings in one room apart. */
      subjectCode: string | null;
    }
  >;
  /**
   * Set when the link is an assignment handed on to cover one lesson. It fixes
   * the room and the subject, and the surface drops everything that outlives a
   * single register: the room switcher, the subject picker, the history.
   */
  assignment: {
    classroomId: number;
    classroomSubjectId: number;
    opensAt: string | null;
    expiresAt: string | null;
  } | null;
  authentication:
    | {
        status: "AUTHENTICATED";
        provider: "GOOGLE" | "THAID";
        displayName: string;
        /** Guarded route + version stamp, like every other photo in the app. */
        photoUrl: string | null;
      }
    | {
        status: "REQUIRED";
        providers: readonly ["GOOGLE", "ARAID"];
      };
}

export interface CheckInOptions {
  date: string;
  classroom: {
    id: number;
    schoolId: number;
    schoolName: string;
    schoolTermId: number;
    academicYear: number;
    semester: number;
    gradeLabel: string;
    roomNumber: number;
    roomName: string | null;
  };
  subjects: Array<{
    classroomSubjectId: number;
    schoolSubjectId: number;
    subjectId: number;
    code: string;
    nameTh: string;
  }>;
}

export interface CheckInStudent {
  id: string;
  studentNumber: string | null;
  firstName: string;
  lastName: string;
  hasPhoto: boolean;
  photoVersion: string | null;
  /** Shown on the roster tab, the same two columns the staff roster carries. */
  riskTier: string | null;
  teacherComment: string | null;
}

export interface CheckInSession {
  id: string;
  classroomId: number;
  classroomSubjectId: number;
  date: string;
  status: "OPEN" | "SUBMITTED" | "REOPENED" | "VOIDED";
  storageMode: "EXCEPTIONS" | "FULL_ROSTER";
  checkingStartedAt: string;
  submittedAt: string | null;
  expectedRosterCount: number;
  recordedCount: number;
  exceptionCount: number;
  submissionNumber: number;
  lockVersion: number;
  hasSubmittedResult: boolean;
  correctionReason: string | null;
  readOnly: boolean;
  idempotent: boolean;
  exceptions: Array<{
    studentId: string;
    status: AttendanceExceptionStatus;
  }>;
}

export interface LocalCheckInMark {
  status: CheckInMarkStatus;
  markedAt: string;
}

export interface AraIdChallenge {
  challengeToken: string;
  verificationUrl: string;
  qrDataUrl: string;
  referenceCode: string;
  expiresAt: string;
}
