import type { ReferralResultCode } from "../../cases/types/cases.types";
import type {
  TaskAccessTask,
  TaskAraIdChallenge,
  TaskAraIdChallengeStatus,
} from "../../tasks/types/task.types";

/** The referral the school sent, as step 1 of the agency's page shows it. */
export interface ReferralReportReferral {
  agency_name: string | null;
  agency_kind_label: string | null;
  starts_at: string | null;
  expires_at: string | null;
  referred_by?: string | null;
  referred_at?: string | null;
  referral_note?: string | null;
}

/** Before the code and AraID: only enough to recognise the link. */
export interface ReferralReportLinkLocked {
  auth_required: true;
  referral: ReferralReportReferral;
  student_name: string;
  student_school: string;
}

/** After them: what the teacher's home-visit link shows, plus the referral. */
export type ReferralReportLinkOpen = {
  auth_required: false;
  reporter_name: string;
  referral: ReferralReportReferral;
  student_school: string | null;
  student_grade: string | null;
  student_room: string | null;
  student_photo_url: string | null;
  student_phone: string | null;
  reason_flagged: string | null;
  case_display_status_label: string | null;
} & Pick<
  TaskAccessTask,
  | "address_district"
  | "address_line"
  | "address_province"
  | "address_sub_district"
  | "contact_channels"
  | "follow_up_history"
  | "is_approximate_home_location"
  | "postal_code"
  | "student_address"
  | "student_lat"
  | "student_lng"
  | "student_name"
>;

export type ReferralReportLink =
  | ReferralReportLinkLocked
  | ReferralReportLinkOpen;

export type ReferralReportAraIdChallenge = TaskAraIdChallenge;
export type ReferralReportAraIdChallengeStatus = TaskAraIdChallengeStatus;

export interface SubmitReferralReportPayload {
  result_code: ReferralResultCode;
  action_date: string;
  result_note: string;
}
