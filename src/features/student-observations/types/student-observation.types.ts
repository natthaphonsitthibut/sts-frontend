export type ObservationConcernLevel = "NOTE" | "WATCH" | "CONCERN";

export interface ObservationDimension {
  id: string;
  code: string;
  labelTh: string;
  requiresComment: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface ObservationBehaviorTag {
  id: string;
  code: string;
  labelTh: string;
  dimensionCode: string | null;
  requiresComment: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface ObservationCatalog {
  dimensions: ObservationDimension[];
  tags: ObservationBehaviorTag[];
}

export interface StudentObservation {
  id: string;
  studentTermId: string;
  schoolId: number;
  author: {
    userId: number;
    username: string;
    displayName: string;
    source: "USER" | "TEACHER_ACCESS";
  };
  assignmentId: string;
  subject: { id: number; code: string | null; name: string | null } | null;
  dimension: { id: string; code: string; labelTh: string };
  concernLevel: ObservationConcernLevel;
  tags: Array<{ id: string; code: string; labelTh: string }>;
  comment: string | null;
  observedAt: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStudentObservationInput {
  assignmentId: number;
  studentTermId: string;
  dimensionCode: string;
  concernLevel: ObservationConcernLevel;
  tagCodes: string[];
  comment?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

export interface ObservationSourceRef {
  observationId: number;
  revision: number;
}

export type HumanRiskDecision = "CONFIRM_RISK" | "WATCH" | "NO_ACTION";
export type TeacherConcernSignal = "NONE" | "WATCH" | "CONCERN";

export interface HumanRiskReview {
  id: string;
  studentTermId: string;
  schoolId: number;
  calculatedAttendanceRisk: string;
  teacherConcernSignal: TeacherConcernSignal;
  humanRiskDecision: HumanRiskDecision;
  decisionReason: string;
  decidedBy: { userId: number; username: string };
  decidedAt: string;
  revision: number;
  sourceObservations: ObservationSourceRef[];
}

export interface CreateHumanRiskReviewInput {
  expectedRevision: number;
  humanRiskDecision: HumanRiskDecision;
  decisionReason: string;
  sourceObservations: ObservationSourceRef[];
}

export type FollowUpUrgency = "NORMAL" | "URGENT";
export type FollowUpReviewDecision =
  | "APPROVE_AND_ASSIGN"
  | "NEED_MORE_INFO"
  | "REJECT";
export type FollowUpStatus = "PENDING_REVIEW" | FollowUpReviewDecision;

export interface StudentFollowUpRequest {
  id: string;
  studentTermId: string;
  schoolId: number;
  requestType: "HOME_VISIT_CONSIDERATION";
  status: FollowUpStatus;
  urgency: FollowUpUrgency;
  reason: string;
  note: string | null;
  requestedBy: { userId: number; username: string };
  assignmentId: number;
  review: {
    decision: FollowUpReviewDecision;
    reason: string | null;
    reviewedBy: { userId: number; username: string };
    reviewedAt: string;
  } | null;
  assignment: {
    taskId: string;
    assignedBy: { userId: number; username: string };
    assignedAt: string;
  } | null;
  revision: number;
  sourceObservations: ObservationSourceRef[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateFollowUpRequestInput {
  assignmentId: number;
  urgency: FollowUpUrgency;
  reason: string;
  note?: string;
  sourceObservations: ObservationSourceRef[];
}

export interface ReviewFollowUpRequestInput {
  expectedRevision: number;
  decision: FollowUpReviewDecision;
  reason: string;
}

export interface StudentObservationSummary {
  id: string;
  studentTermId: string;
  summaryText: string;
  themes: string[];
  trends: string[];
  agreements: string[];
  conflictingEvidence: string[];
  citations: Array<{
    observationId: string;
    observationRevision: number;
    order: number;
  }>;
  aiGenerated: true;
  providerCode: string;
  modelCode: string;
  promptVersion: string;
  sourceObservationCount: number;
  isStale: boolean;
  review: {
    state: "PENDING_REVIEW" | "REVIEWED" | "REJECTED";
    reviewerDisplayName: string | null;
    note: string | null;
    reviewedAt: string | null;
  };
  generatedAt: string;
}

export interface ObservationSummaryResponse {
  data: StudentObservationSummary | null;
  generation: {
    available: boolean;
    reason: "DISABLED_OR_NOT_GENERATED" | "PROVIDER_NOT_CONFIGURED";
  };
}

export type GenerateObservationSummaryResult =
  | { available: false }
  | { available: true; data: StudentObservationSummary; reused: boolean };
