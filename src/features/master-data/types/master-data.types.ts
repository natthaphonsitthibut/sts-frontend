import type { PaginationMeta } from "../../../lib/pagination";

export const MASTER_DATA_CATALOGS = [
  { id: "absence-reason-categories", label: "หมวดสาเหตุการขาด" },
  { id: "absence-reasons", label: "สาเหตุการขาด", category: true },
  { id: "disadvantage-types", label: "ประเภทความด้อยโอกาส", sourceOnec: true },
  { id: "disability-types", label: "ประเภทความพิการ", sourceOnec: true },
  {
    id: "assistance-measures",
    label: "มาตรการช่วยเหลือ",
    requiresDetail: true,
  },
  { id: "referral-agency-kinds", label: "ประเภทหน่วยงานส่งต่อ" },
  { id: "referral-agencies", label: "หน่วยงานส่งต่อ", agency: true },
  { id: "non-follow-up-reasons", label: "สาเหตุที่ติดตามไม่สำเร็จ" },
] as const;

export type MasterDataCatalog = (typeof MASTER_DATA_CATALOGS)[number]["id"];

export interface CodedMasterDataItem {
  code: string;
  labelTh: string;
  sortOrder: number;
  isActive: boolean;
  categoryCode: string | null;
  sourceOnecCode: number | null;
  requiresDetail: boolean | null;
  usageCount: number;
}

export interface ReferralAgencyItem {
  id: number;
  agencyName: string;
  agencyKindCode: string;
  agencyKindLabelTh: string;
  contactPhone: string | null;
  contactEmail: string | null;
  websiteUrl: string | null;
  isActive: boolean;
  usageCount: number;
}

export interface MasterDataListQuery {
  page: number;
  limit: number;
  searchTerm?: string;
  includeInactive?: boolean;
}

export interface MasterDataListResult<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface CodedMasterDataPayload {
  code: string;
  labelTh: string;
  sortOrder: number;
  isActive?: boolean;
  categoryCode?: string | null;
  sourceOnecCode?: number | null;
  requiresDetail?: boolean;
}

export interface ReferralAgencyPayload {
  agencyName: string;
  agencyKindCode: string;
  contactPhone?: string | null;
  contactEmail?: string | null;
  websiteUrl?: string | null;
  isActive?: boolean;
}
