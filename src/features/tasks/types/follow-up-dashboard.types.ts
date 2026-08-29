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
    byAgency: Array<{ agencyName: string; count: number }>;
  };
  repeatedUnsuccessfulCaseCount: number;
}

export interface ReferralDrilldownRow {
  id: string;
  caseId: number;
  studentId: string | null;
  studentName: string;
  studentPhotoUrl: string | null;
  schoolId: number | null;
  schoolName: string | null;
  statusCode: string;
  referredAt: string;
  agencyName: string;
  agencyKindLabel: string;
}

export interface ReferralDrilldownResult {
  items: ReferralDrilldownRow[];
  meta: PaginationMeta;
}
