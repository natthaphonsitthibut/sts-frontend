import type { PaginatedResult } from "../../../lib/pagination";

export type MasterDataLookupTable =
  | "school_affiliations"
  | "disability_types"
  | "absence_reason_categories"
  | "absence_reasons"
  | "non_follow_up_reasons";

export interface MasterDataLookup {
  id: number | string;
  code: string;
  name: string;
  note?: string | null;
  is_active?: boolean | null;
  legal_category?: string | null;
  category_id?: number | string | null;
}

export interface MasterDataLookupPayload {
  code: string;
  name: string;
  note?: string | null;
  is_active?: boolean;
  legal_category?: string | null;
  category_id?: number;
}

export interface MasterDataLookupListQuery {
  table: MasterDataLookupTable;
  page: number;
  limit: number;
  searchTerm?: string;
}

export type MasterDataLookupListResult = PaginatedResult<MasterDataLookup>;

export interface MasterDataLookupConfig {
  table: MasterDataLookupTable;
  title: string;
  description: string;
  unitLabel: string;
  hasLegalCategory?: boolean;
  hasCategory?: boolean;
}

export const MASTER_DATA_LOOKUP_CONFIGS: MasterDataLookupConfig[] = [
  {
    table: "school_affiliations",
    title: "สังกัดโรงเรียน",
    description: "ข้อมูลอ้างอิงสังกัดโรงเรียนสำหรับการ wire FK รอบถัดไป",
    unitLabel: "สังกัด",
  },
  {
    table: "disability_types",
    title: "ประเภทความพิการ",
    description: "ข้อมูลอ้างอิงความพิการระดับบุคคล",
    unitLabel: "ประเภท",
    hasLegalCategory: true,
  },
  {
    table: "absence_reason_categories",
    title: "หมวดเหตุผลการขาดเรียน",
    description: "หมวดหลักสำหรับจัดกลุ่มเหตุผลการขาดเรียน",
    unitLabel: "หมวด",
  },
  {
    table: "absence_reasons",
    title: "เหตุผลการขาดเรียน",
    description: "เหตุผลย่อยที่ผูกกับหมวดเหตุผลการขาดเรียน",
    unitLabel: "เหตุผล",
    hasCategory: true,
  },
  {
    table: "non_follow_up_reasons",
    title: "เหตุผลไม่ติดตามต่อ",
    description: "เหตุผลอ้างอิงสำหรับเคสที่ไม่สามารถติดตามต่อได้",
    unitLabel: "เหตุผล",
  },
];

export function getMasterDataLookupConfig(
  table: MasterDataLookupTable,
): MasterDataLookupConfig {
  return MASTER_DATA_LOOKUP_CONFIGS.find((config) => config.table === table)
    ?? MASTER_DATA_LOOKUP_CONFIGS[0];
}
