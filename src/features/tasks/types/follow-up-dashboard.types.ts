import type { PaginationMeta } from "../../../lib/pagination";

export interface FollowUpOutcomeSummary {
  succeeded: number;
  notSucceeded: number;
  total: number;
  successRate: number | null;
}

export interface FollowUpSummary {
  outcomes: {
    visit: FollowUpOutcomeSummary;
    assist: FollowUpOutcomeSummary;
  };
  assistanceMeasures: Array<{
    code: string;
    label: string;
    succeeded: number;
    notSucceeded: number;
    total: number;
  }>;
  referrals: {
    total: number;
    overdue: number;
    byStatus: Record<string, number>;
    /** Rows per stage of รอส่งต่อ → รอผล → พิจารณา → ผล. */
    byStage: Record<string, number>;
    byAgency: Array<{ agencyName: string; count: number }>;
  };
  repeatedUnsuccessfulCaseCount: number;
}

export interface ReferralDrilldownRow {
  /** Null for a case still in รอส่งต่อ: nothing has been sent yet. */
  id: string | null;
  caseId: number;
  studentId: string | null;
  studentName: string;
  studentPhotoUrl: string | null;
  schoolId: number | null;
  schoolName: string | null;
  academicYear?: number | null;
  semester?: number | null;
  grade: string | null;
  room: string | null;
  statusCode: string;
  /** Where the referral stands: one of the register's card codes. */
  stageCode: string;
  /** Still waiting on the agency: its case sits in รอผลการส่งต่อ. */
  awaitingResult: boolean;
  referredAt: string | null;
  agencyName: string | null;
  agencyKindLabel: string | null;
  /** The agency's link while it still opens; null when there is none to share. */
  linkUrl: string | null;
  linkStatusCode: string | null;
  linkExpiresAt: string | null;
  accessCodeAvailable?: boolean;
}

export interface ReferralDrilldownResult {
  items: ReferralDrilldownRow[];
  meta: PaginationMeta;
}
