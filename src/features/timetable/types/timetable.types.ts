export interface Subject {
  id: number;
  code: string;
  name_th: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubjectListResponse {
  success: true;
  data: Subject[];
  meta: { page: number; limit: number; totalCount: number; totalPages: number };
}

export interface CreateSubjectPayload {
  code: string;
  nameTh: string;
}

export interface UpdateSubjectPayload {
  nameTh?: string;
  isActive?: boolean;
}

export interface TimetableSlot {
  id: string;
  school_term_id: string;
  school_id: number;
  grade_level_id: number;
  room_no: number;
  day_of_week: number;
  period: number;
  subject_id: number;
  subject_code: string;
  subject_name_th: string;
  teacher_user_id: number | null;
  teacher_name: string | null;
}

export interface RoomSubject {
  subject_id: number;
  code: string;
  name_th: string;
}

export interface CreateTimetableSlotPayload {
  schoolTermId: number;
  schoolId: number;
  gradeLevelId: number;
  roomNo: number;
  dayOfWeek: number;
  period: number;
  subjectId: number;
  teacherUserId?: number | null;
}

export interface UpdateTimetableSlotPayload {
  subjectId?: number;
  teacherUserId?: number | null;
}
