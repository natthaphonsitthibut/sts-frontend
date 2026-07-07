/** Must match FIELD_MONITOR_MAP_MAX_STUDENTS in the backend DTO. */
export const FIELD_MONITOR_MAP_MAX_STUDENTS = 50;

export interface FieldMonitorMapPin {
  student_uuid: string;
  student_name: string;
  school_name: string | null;
  risk_tier: string;
  has_coordinates: boolean;
  lat: number | null;
  lng: number | null;
}

export interface FieldMonitorMapResponse {
  success: true;
  data: FieldMonitorMapPin[];
  requestedCount: number;
}
