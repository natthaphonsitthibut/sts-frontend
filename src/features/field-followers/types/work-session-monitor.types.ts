export type WorkSessionEndReason = "MANUAL" | "SUBMITTED" | "TIMEOUT";

export interface ActiveWorkSession {
  session_id: string;
  task_link_id: string;
  started_at: string;
  consent_at: string;
  assigned_to_name: string | null;
  student_name: string | null;
  school_name: string | null;
  last_ping_lat: number | null;
  last_ping_lng: number | null;
  last_ping_at: string | null;
}

export interface RecentlyEndedWorkSession {
  session_id: string;
  task_link_id: string;
  started_at: string;
  ended_at: string;
  end_reason: WorkSessionEndReason;
  assigned_to_name: string | null;
  student_name: string | null;
}

export interface WorkSessionMonitorResponse {
  success: true;
  active: ActiveWorkSession[];
  recentlyEnded: RecentlyEndedWorkSession[];
}
