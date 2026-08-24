export type CheckInAccess = "INTERNAL" | "PUBLIC_LINK";
export type CheckInMarkStatus = "P_PRESENT" | "P_ABSENT" | "P_LATE" | "P_LEAVE";
export type AttendanceExceptionStatus = Exclude<CheckInMarkStatus, "P_PRESENT">;

export interface CheckInContext {
  school: { id: number; name: string };
  term: { id: number; academicYear: number; semester: number };
  classroom: {
    id: number;
    gradeLabel: string;
    roomNumber: number;
    roomName: string | null;
  };
  authentication:
    | {
        status: "AUTHENTICATED";
        provider: "GOOGLE" | "THAID";
        displayName: string;
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
  absenceReasons: Array<{
    code: string;
    labelTh: string;
    categoryCode: string | null;
  }>;
}

export interface CheckInStudent {
  id: string;
  studentNumber: string | null;
  firstName: string;
  lastName: string;
  hasPhoto: boolean;
  photoVersion: string | null;
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
  revision: number;
  readOnly: boolean;
  idempotent: boolean;
  exceptions: Array<{
    studentId: string;
    status: AttendanceExceptionStatus;
    absenceReasonCode: string | null;
  }>;
}

export interface LocalCheckInMark {
  status: CheckInMarkStatus;
  markedAt: string;
  absenceReasonCode?: string | null;
}

export interface AraIdChallenge {
  challengeToken: string;
  verificationUrl: string;
  qrDataUrl: string;
  referenceCode: string;
  expiresAt: string;
}
