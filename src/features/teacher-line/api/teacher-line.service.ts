import { apiClient } from "../../../lib/api-client";
import { getApiErrorMessage } from "../../../lib/api-error";

interface DataEnvelope<T> {
  data: T;
}

export interface TeacherLineInvitationSummary {
  teacherName: string;
  maskedEmail: string;
  expiresAt: string;
}

export interface TeacherLineGroupInvitationSummary {
  schoolId: number;
  schoolName: string;
  startsAt: string;
  expiresAt: string;
  status: "PENDING" | "ACTIVE";
}

export interface TeacherLineAraIdChallenge {
  challengeToken: string;
  verificationUrl: string;
  qrDataUrl: string;
  referenceCode: string;
  expiresAt: string;
  schoolName: string;
  status: "PENDING" | "CLAIMED" | "APPROVED";
}

async function resolveGroupInvitation(
  token: string,
): Promise<TeacherLineGroupInvitationSummary> {
  return invitationPost(
    "/line/link/group-invitation/resolve",
    { token },
    "ลิงก์ยืนยัน LINE ไม่ถูกต้องหรือหมดอายุแล้ว",
  );
}

async function invitationPost<T>(
  path: string,
  body: {
    token?: string;
    challengeToken?: string;
    code?: string;
    email?: string;
  },
  fallback: string,
): Promise<T> {
  try {
    const response = await apiClient.post<DataEnvelope<T>>(path, body);
    return response.data.data;
  } catch (error) {
    // Do not retain Axios' request config: it contains the invitation token.
    // eslint-disable-next-line preserve-caught-error
    throw new Error(getApiErrorMessage(error, fallback));
  }
}

async function resolveInvitation(
  token: string,
): Promise<TeacherLineInvitationSummary> {
  return invitationPost(
    "/line/link/invitation/resolve",
    { token },
    "ลิงก์ยืนยัน LINE ไม่ถูกต้องหรือหมดอายุแล้ว",
  );
}

async function requestInvitationOtp(token: string): Promise<string> {
  const result = await invitationPost<{ message: string }>(
    "/line/link/invitation/otp/request",
    { token },
    "ส่งรหัส OTP ไม่สำเร็จ",
  );
  return result.message;
}

async function verifyInvitationOtp(
  token: string,
  code: string,
): Promise<{ bindingToken: string; teacherName: string }> {
  return invitationPost(
    "/line/link/invitation/otp/verify",
    { token, code },
    "ยืนยันรหัสไม่สำเร็จ",
  );
}

/** Identical whether or not the address belongs to a teacher, by design. */
async function requestOtp(token: string, email: string): Promise<string> {
  const result = await invitationPost<{ message: string }>(
    "/line/link/otp/request",
    { token, email },
    "ส่งรหัส OTP ไม่สำเร็จ",
  );
  return result.message;
}

async function verifyOtp(
  token: string,
  email: string,
  code: string,
): Promise<{ bindingToken: string; teacherName: string }> {
  return invitationPost(
    "/line/link/otp/verify",
    { token, email, code },
    "ยืนยันรหัสไม่สำเร็จ",
  );
}

async function verifyAraId(
  token: string,
): Promise<{ bindingToken: string; teacherName: string }> {
  return invitationPost(
    "/line/link/araid/verify",
    { token },
    "ยืนยันตัวตนผ่าน AraID ไม่สำเร็จ",
  );
}

async function createAraIdChallenge(token: string): Promise<TeacherLineAraIdChallenge> {
  return invitationPost(
    "/line/link/araid/challenge",
    { token },
    "สร้างคำขอยืนยันผ่าน AraID ไม่สำเร็จ",
  );
}

async function getAraIdChallenge(
  challengeToken: string,
): Promise<TeacherLineAraIdChallenge> {
  return invitationPost(
    "/line/link/araid/challenge/details",
    { challengeToken },
    "คำขอยืนยันผ่าน AraID ไม่ถูกต้องหรือหมดอายุแล้ว",
  );
}

async function beginAraIdChallenge(
  challengeToken: string,
): Promise<{ expiresAt: string }> {
  return invitationPost(
    "/line/link/araid/challenge/begin",
    { challengeToken },
    "คำขอยืนยันผ่าน AraID ถูกใช้หรือหมดอายุแล้ว",
  );
}

async function approveAraIdChallenge(): Promise<void> {
  await invitationPost(
    "/line/link/araid/challenge/approve",
    {},
    "อนุมัติคำขอ AraID ไม่สำเร็จ",
  );
}

async function pollAraIdChallenge(challengeToken: string): Promise<
  | { status: "PENDING" }
  | { status: "IN_PROGRESS"; expiresAt: string }
  | { status: "APPROVED"; bindingToken: string; teacherName: string }
> {
  return invitationPost(
    "/line/link/araid/challenge/status",
    { challengeToken },
    "ตรวจสอบสถานะ AraID ไม่สำเร็จ",
  );
}

async function isEnabled(): Promise<boolean> {
  const response =
    await apiClient.get<DataEnvelope<{ enabled: boolean }>>(
      "/line/link/status",
    );
  return response.data.data.enabled;
}

/** The short-lived proof stays in the request body, never browser history. */
async function startAuthorization(bindingToken: string): Promise<string> {
  const response = await apiClient.post<
    DataEnvelope<{ authorizationUrl: string }>
  >("/line/link/start", { token: bindingToken });
  return response.data.data.authorizationUrl;
}

export const teacherLineService = {
  resolveGroupInvitation,
  createAraIdChallenge,
  getAraIdChallenge,
  beginAraIdChallenge,
  approveAraIdChallenge,
  pollAraIdChallenge,
  verifyAraId,
  resolveInvitation,
  requestInvitationOtp,
  verifyInvitationOtp,
  requestOtp,
  verifyOtp,
  isEnabled,
  startAuthorization,
};
