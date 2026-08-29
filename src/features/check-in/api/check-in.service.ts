import type { UpdateClassroomPresentationInput } from "../../school-structure/types/school-structure.types";
import type { LinkAttendanceAssignmentPayload } from "../../classroom-links/types/classroom-links.types";
import { apiClient } from "../../../lib/api-client";
import type {
  ClassroomStudentCommentConcernLevelOption,
  ClassroomStudentProblemCategoryOption,
  StudentClassroomCommentsResponse,
} from "../../school-structure/types/school-structure.types";
import { getApiErrorMessage } from "../../../lib/api-error";
import type {
  AraIdChallenge,
  AttendanceExceptionStatus,
  CheckInContext,
  CheckInOptions,
  CheckInSession,
  CheckInStudent,
} from "../types/check-in.types";

interface DataEnvelope<T> {
  success: true;
  data: T;
}

const TOKEN_HEADER = "x-classroom-link-token";

async function publicTokenRequest<T>(
  request: () => Promise<{ data: DataEnvelope<T> }>,
  fallback: string,
): Promise<T> {
  try {
    return (await request()).data.data;
  } catch (error) {
    // Never rethrow Axios' request object: it retains the raw classroom token
    // in config.headers and can later be printed by a generic error boundary.
    // eslint-disable-next-line preserve-caught-error -- attaching the Axios error would retain the secret request header
    throw new Error(getApiErrorMessage(error, fallback));
  }
}

async function getPublicContext(token?: string): Promise<CheckInContext> {
  return await publicTokenRequest(
    () =>
      apiClient.get<DataEnvelope<CheckInContext>>("/classroom/context", {
        headers: token ? { [TOKEN_HEADER]: token } : undefined,
      }),
    "เปิดลิงก์ห้องเรียนไม่สำเร็จ",
  );
}

async function startGoogle(token: string): Promise<string> {
  const result = await publicTokenRequest(
    () =>
      apiClient.get<DataEnvelope<{ authorizationUrl: string }>>(
        "/classroom/auth/google/start",
        { headers: { [TOKEN_HEADER]: token } },
      ),
    "เริ่มยืนยันด้วย Google ไม่สำเร็จ",
  );
  return result.authorizationUrl;
}

async function verifyDevelopmentGoogle(
  token: string,
  email: string,
): Promise<void> {
  await publicTokenRequest(
    () =>
      apiClient.post<DataEnvelope<{ authenticated: true }>>(
        "/classroom/auth/google/development",
        { email },
        { headers: { [TOKEN_HEADER]: token } },
      ),
    "ตรวจสอบอีเมลครูไม่สำเร็จ",
  );
}

async function createAraIdChallenge(token: string): Promise<AraIdChallenge> {
  return await publicTokenRequest(
    () =>
      apiClient.post<DataEnvelope<AraIdChallenge>>(
        "/classroom/auth/araid/challenge",
        undefined,
        { headers: { [TOKEN_HEADER]: token } },
      ),
    "เริ่มยืนยันด้วย AraID ไม่สำเร็จ",
  );
}

async function beginAraIdChallenge(
  challengeToken: string,
): Promise<{ expiresAt: string }> {
  return await publicTokenRequest(
    () =>
      apiClient.post<DataEnvelope<{ expiresAt: string }>>(
        "/classroom/auth/araid/challenge/begin",
        undefined,
        { headers: { "x-araid-challenge": challengeToken } },
      ),
    "เริ่มยืนยัน AraID ไม่สำเร็จ",
  );
}

async function approveAraIdChallenge(): Promise<void> {
  await publicTokenRequest(
    () =>
      apiClient.post<DataEnvelope<{ approved: true }>>(
        "/classroom/auth/araid/challenge/approve",
      ),
    "ยืนยัน AraID ไม่สำเร็จ",
  );
}

async function pollAraIdChallenge(challengeToken: string): Promise<{
  status: "PENDING" | "IN_PROGRESS" | "APPROVED";
}> {
  return await publicTokenRequest(
    () =>
      apiClient.post<
        DataEnvelope<{ status: "PENDING" | "IN_PROGRESS" | "APPROVED" }>
      >("/classroom/auth/araid/challenge/status", undefined, {
        headers: { "x-araid-challenge": challengeToken },
      }),
    "ตรวจสอบสถานะ AraID ไม่สำเร็จ",
  );
}

async function getOptions(input: {
  access: "INTERNAL" | "PUBLIC_LINK";
  date: string;
  classroomId?: number;
}): Promise<CheckInOptions> {
  const response = await apiClient.get<DataEnvelope<CheckInOptions>>(
    input.access === "INTERNAL"
      ? "/attendance/check-in/options"
      : "/classroom/subjects",
    {
      params: {
        date: input.date,
        classroomId: input.classroomId,
      },
    },
  );
  return response.data.data;
}

async function getRoster(input: {
  access: "INTERNAL" | "PUBLIC_LINK";
  classroomId?: number;
}): Promise<CheckInStudent[]> {
  const response = await apiClient.get<DataEnvelope<CheckInStudent[]>>(
    input.access === "INTERNAL"
      ? "/attendance/check-in/roster"
      : "/classroom/roster",
    {
      params: { classroomId: input.classroomId },
    },
  );
  return response.data.data ?? [];
}

async function startSession(input: {
  access: "INTERNAL" | "PUBLIC_LINK";
  classroomId?: number;
  date: string;
  classroomSubjectId: number;
}): Promise<CheckInSession> {
  const response = await apiClient.post<DataEnvelope<CheckInSession>>(
    input.access === "INTERNAL"
      ? "/attendance/check-in/sessions/start"
      : "/classroom/sessions/start",
    {
      date: input.date,
      classroomSubjectId: input.classroomSubjectId,
      classroomId: input.classroomId,
    },
  );
  return response.data.data;
}

async function submitSession(input: {
  access: "INTERNAL" | "PUBLIC_LINK";
  classroomId?: number;
  sessionId: string;
  exceptions: Array<{
    studentId: string;
    status: AttendanceExceptionStatus;
    markedAt: string;
  }>;
}): Promise<CheckInSession> {
  const response = await apiClient.post<DataEnvelope<CheckInSession>>(
    input.access === "INTERNAL"
      ? `/attendance/check-in/sessions/${input.sessionId}/submit`
      : `/classroom/sessions/${input.sessionId}/submit`,
    {
      exceptions: input.exceptions,
      // The staff route takes the room from the signed-in scope; the link has
      // to be told which of its rooms this register belongs to.
      ...(input.access === "INTERNAL" || !input.classroomId
        ? {}
        : { classroomId: input.classroomId }),
    },
  );
  return response.data.data;
}

function getStudentPhotoUrl(input: {
  access: "INTERNAL" | "PUBLIC_LINK";
  classroomId?: number;
  studentId: string;
  photoVersion?: string | null;
}): string {
  return apiClient.getUri({
    url:
      input.access === "INTERNAL"
        ? "/attendance/check-in/student-photo"
        : "/classroom/student-photo",
    // The room goes on both paths. A standing link reaches every room its
    // teacher's subjects touch, so the link cannot infer one from the session
    // either — without it the photo request is refused.
    params: {
      studentId: input.studentId,
      ...(input.classroomId ? { classroomId: input.classroomId } : {}),
      ...(input.photoVersion ? { v: input.photoVersion } : {}),
    },
  });
}

/**
 * The comment pickers and the write, both under the link's own namespace. The
 * shapes match the staff endpoints exactly, which is what lets the one comment
 * dialog serve both surfaces.
 */
async function getCommentOptions(): Promise<{
  problemCategories: ClassroomStudentProblemCategoryOption[];
  concernLevels: ClassroomStudentCommentConcernLevelOption[];
}> {
  const response = await apiClient.get<
    DataEnvelope<{
      problemCategories: ClassroomStudentProblemCategoryOption[];
      concernLevels: ClassroomStudentCommentConcernLevelOption[];
    }>
  >("/classroom/students/comment-options");
  return response.data.data ?? { problemCategories: [], concernLevels: [] };
}

async function createComment(input: {
  studentUuid: string;
  problemCategory: string;
  concernLevelCode: string;
  problemDescription: string;
}): Promise<unknown> {
  const response = await apiClient.post(
    `/classroom/students/${encodeURIComponent(input.studentUuid)}/comments`,
    {
      problemCategory: input.problemCategory,
      concernLevelCode: input.concernLevelCode,
      problemDescription: input.problemDescription,
    },
  );
  return response.data;
}

async function listComments(
  studentUuid: string,
): Promise<StudentClassroomCommentsResponse> {
  const response = await apiClient.get<StudentClassroomCommentsResponse>(
    `/classroom/students/${encodeURIComponent(studentUuid)}/comments`,
  );
  return response.data;
}

/**
 * Hands one of this teacher's own lessons on to whoever can cover it.
 *
 * The same act the admin page performs, through the link's namespace: a teacher
 * standing in their link holds no account, and the responsibility for the room
 * is theirs, so the school should not have to be asked to pass it along.
 */
async function createAssignment(
  input: LinkAttendanceAssignmentPayload,
): Promise<{ data: { accessUrl: string } }> {
  const response = await apiClient.post<{ data: { accessUrl: string } }>(
    "/classroom/assignments",
    input,
  );
  return response.data;
}

/**
 * Recolours or re-covers a room from inside a link.
 *
 * The very same record ห้องเรียนทั้งหมด writes — a card belongs to the room, so
 * a change made here shows there and the other way round. The link namespace is
 * only the door; what it opens onto is one classroom row, not a copy.
 */
async function updateClassroomPresentation({
  classroomId,
  cardCoverColor,
  coverImagePositionX,
  coverImagePositionY,
  coverImageScale,
  file,
  removeCover,
}: UpdateClassroomPresentationInput): Promise<void> {
  const formData = new FormData();
  formData.append("classroomId", classroomId);
  formData.append("cardCoverColor", cardCoverColor);
  formData.append("coverImagePositionX", String(coverImagePositionX));
  formData.append("coverImagePositionY", String(coverImagePositionY));
  formData.append("coverImageScale", String(coverImageScale));
  if (file) formData.append("photo", file);
  if (removeCover) formData.append("removeCover", "true");
  await apiClient.patch("/classroom/classroom-presentation", formData);
}

export const checkInService = {
  createAssignment,
  updateClassroomPresentation,
  createComment,
  getCommentOptions,
  listComments,
  createAraIdChallenge,
  getOptions,
  getPublicContext,
  getRoster,
  approveAraIdChallenge,
  beginAraIdChallenge,
  getStudentPhotoUrl,
  pollAraIdChallenge,
  startGoogle,
  verifyDevelopmentGoogle,
  startSession,
  submitSession,
};
