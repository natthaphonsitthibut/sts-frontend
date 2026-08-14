import { formatRoomLabel } from "../../../lib/room-presentation";



export function formatStudentRoom(room: string | null | undefined): string {
  return formatRoomLabel(room);
}

/**
 * Single source of truth for `student_risk_profiles.risk_tier` labels, so
 * every consumer of this tier reads from here instead of keeping its own copy.
 */
export const RISK_TIER_LABELS: Record<string, string> = {
  HIGH: "เสี่ยง",
  WATCH: "เฝ้าระวัง",
  NORMAL: "ปกติ",
};

export function getRiskTierLabel(tier: string): string {
  return RISK_TIER_LABELS[tier] ?? tier;
}

/** Options for the risk-tier `FilterSelect` — `AT_RISK` (every tier except
 * NORMAL) is the recommended default for "at-risk children" pickers. */
export const STUDENT_RISK_TIER_FILTER_OPTIONS = [
  { value: "AT_RISK", label: "เด็กเสี่ยงทั้งหมด" },
  ...Object.entries(RISK_TIER_LABELS).map(([value, label]) => ({ value, label })),
  { value: "", label: "ทุกคน (รวมปกติ)" },
] as const;
