export type AraIdGenderCode = "MALE" | "FEMALE" | "OTHER";

export interface AraIdRecordInput {
  identityNumber: string;
  titleTh: string;
  givenNameTh: string;
  familyNameTh: string;
  givenNameEn?: string | null;
  familyNameEn?: string | null;
  dateOfBirth?: string | null;
  genderCode?: AraIdGenderCode | null;
  phoneNumber?: string | null;
  emailAddress?: string | null;
  addressLine?: string | null;
  subDistrictName?: string | null;
  districtName?: string | null;
  provinceName?: string | null;
  postalCode?: string | null;
  pin: string;
}

export interface AraIdRecord {
  id: string;
  identityNumber: string;
  titleTh: string | null;
  givenNameTh: string;
  familyNameTh: string;
  givenNameEn: string | null;
  familyNameEn: string | null;
  dateOfBirth: string | null;
  genderCode: AraIdGenderCode | null;
  phoneNumber: string | null;
  emailAddress: string | null;
  addressLine: string | null;
  subDistrictName: string | null;
  districtName: string | null;
  provinceName: string | null;
  postalCode: string | null;
  recordStatus: "ACTIVE" | "INACTIVE";
  hasPin: true;
  createdAt: string;
  updatedAt: string;
}

export interface AraIdRecordSummary {
  id: string;
  identityNumberMasked: string;
  titleTh: string | null;
  givenNameTh: string;
  familyNameTh: string;
  givenNameEn: string | null;
  familyNameEn: string | null;
  provinceName: string | null;
  recordStatus: "ACTIVE" | "INACTIVE";
  updatedAt: string;
}

export interface AraIdRecordListQuery {
  page: number;
  limit: number;
  search?: string;
  recordStatus?: "ACTIVE" | "INACTIVE";
}

export interface AraIdRecordListResult {
  data: AraIdRecordSummary[];
  meta: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
  counts: {
    total: number;
    active: number;
  };
}

export interface AraIdSessionProfile extends Omit<
  AraIdRecord,
  "identityNumber"
> {
  profileId: string;
  identityNumberMasked: string;
}

/**
 * Which flow a QR challenge belongs to. Older teacher-link QR codes carry no
 * scope, so the absent value has to keep meaning `teacher-access`. Every hop
 * that leaves the authorize screen (login, PIN) has to carry it back, or the
 * challenge is looked up under the wrong scope and reads as expired.
 */
export type AraIdChallengeScope =
  | "teacher-access"
  | "task-link"
  | "admin-login";
