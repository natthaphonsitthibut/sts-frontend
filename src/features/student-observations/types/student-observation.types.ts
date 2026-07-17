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
    source: "USER" | "TEACHER_ACCESS" | "TASK_LINK";
  };
  assignmentId: string | null;
  sourceTaskLinkId?: string | null;
  sourceTimetableSlotId?: string | null;
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
  assignmentId?: number;
  timetableSlotId?: number;
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

export interface HumanRiskReviewState {
  review: HumanRiskReview | null;
  currentCalculatedAttendanceRisk: string;
}

export interface CreateHumanRiskReviewInput {
  expectedRevision: number;
  humanRiskDecision: HumanRiskDecision;
  decisionReason: string;
  sourceObservations: ObservationSourceRef[];
}

export type FollowUpUrgency = "NORMAL" | "URGENT";
export type FollowUpReviewDecision = "APPROVED" | "REJECTED";
export type FollowUpStatus = "PENDING_REVIEW" | FollowUpReviewDecision;

export interface StudentFollowUpRequest {
  id: string;
  studentTermId: string;
  schoolId: number;
  requestType: "HOME_VISIT_CONSIDERATION";
  status: FollowUpStatus;
  statusPresentation: { labelTh: string; badgeVariant: string };
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
  openedCase: { caseId: number; status: string } | null;
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

export interface TeacherObservationReport {
  reportKind: "FOLLOW_UP_REQUEST" | "OBSERVATION";
  reportId: string;
  observationId: string;
  observationRevision: number;
  studentTermId: string;
  studentName: string;
  schoolId: number;
  schoolName: string;
  gradeLevelId: number | null;
  gradeLabel: string | null;
  classroomId: string | null;
  roomNo: number | null;
  authorDisplayName: string;
  dimensionLabel: string;
  concernLevel: ObservationConcernLevel;
  comment: string | null;
  observedAt: string;
  followUpRequestId: string | null;
  followUpStatus: FollowUpStatus | null;
  urgency: FollowUpUrgency | null;
  openedCaseId: number | null;
  openedCaseStatus: string | null;
}

export interface TeacherObservationReportFilters {
  page?: number;
  limit?: number;
  status?: FollowUpStatus;
  concernLevel?: ObservationConcernLevel;
  urgency?: FollowUpUrgency;
  schoolId?: number;
  gradeLevelId?: number;
  roomId?: string;
  searchTerm?: string;
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
