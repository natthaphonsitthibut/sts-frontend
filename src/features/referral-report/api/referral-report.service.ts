import { apiClient } from "../../../lib/api-client";
import { resolveApiMediaUrl } from "../../../lib/media-url";
import type {
  ReferralReportAraIdChallenge,
  ReferralReportAraIdChallengeStatus,
  ReferralReportLink,
  SubmitReferralReportPayload,
} from "../types/referral-report.types";

const SESSION_HEADER = "x-referral-session";
const CHALLENGE_HEADER = "x-referral-araid-challenge";

function sessionConfig(sessionToken?: string) {
  return sessionToken
    ? { headers: { [SESSION_HEADER]: sessionToken } }
    : undefined;
}

function linkPath(token: string): string {
  return `/referral-links/${encodeURIComponent(token)}`;
}

async function getLink(
  token: string,
  sessionToken?: string,
): Promise<ReferralReportLink> {
  const response = await apiClient.get<{ data: ReferralReportLink }>(
    linkPath(token),
    sessionConfig(sessionToken),
  );
  return response.data.data;
}

/** Checks the school's access code; a right one starts the AraID challenge. */
async function createAraIdChallenge(
  token: string,
  accessCode: string,
): Promise<ReferralReportAraIdChallenge> {
  const response = await apiClient.post<{ data: ReferralReportAraIdChallenge }>(
    `${linkPath(token)}/araid/challenge`,
    { access_code: accessCode },
  );
  return response.data.data;
}

async function beginAraIdChallenge(
  challengeToken: string,
): Promise<{ expiresAt: string }> {
  const response = await apiClient.post<{ data: { expiresAt: string } }>(
    "/referral-links/araid/challenge/begin",
    undefined,
    { headers: { [CHALLENGE_HEADER]: challengeToken } },
  );
  return response.data.data;
}

async function approveAraIdChallenge(): Promise<void> {
  await apiClient.post("/referral-links/araid/challenge/approve");
}

async function pollAraIdChallenge(
  challengeToken: string,
): Promise<ReferralReportAraIdChallengeStatus> {
  const response = await apiClient.post<{
    data: ReferralReportAraIdChallengeStatus;
  }>("/referral-links/araid/challenge/status", undefined, {
    headers: { [CHALLENGE_HEADER]: challengeToken },
  });
  return response.data.data;
}

async function getStudentPhoto(
  photoUrl: string,
  sessionToken?: string,
): Promise<Blob> {
  // The payload's path already includes /api; make it absolute so the client
  // does not prefix its base a second time.
  const absolute = new URL(
    resolveApiMediaUrl(photoUrl) ?? photoUrl,
    window.location.origin,
  ).toString();
  const response = await apiClient.get<Blob>(absolute, {
    ...sessionConfig(sessionToken),
    responseType: "blob",
  });
  return response.data;
}

async function submitReport(
  token: string,
  sessionToken: string,
  payload: SubmitReferralReportPayload,
): Promise<void> {
  await apiClient.post(
    `${linkPath(token)}/report`,
    payload,
    sessionConfig(sessionToken),
  );
}

export const referralReportService = {
  approveAraIdChallenge,
  beginAraIdChallenge,
  createAraIdChallenge,
  getLink,
  getStudentPhoto,
  pollAraIdChallenge,
  submitReport,
};
