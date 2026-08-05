import { Activity, CheckCircle2, Siren, type LucideIcon } from "lucide-react";
import { RISK_TIER_LABELS } from "./student-presentation";

export type RiskTierPresentation = {
  label: string;
  badge: "default" | "secondary" | "destructive" | "success" | "warning";
  tone: "default" | "success" | "warning" | "danger" | "info";
  icon: LucideIcon;
};

/** Shared visual contract for persisted student risk tiers. */
export const RISK_TIER_PRESENTATION: Record<string, RiskTierPresentation> = {
  HIGH: {
    label: RISK_TIER_LABELS.HIGH,
    badge: "destructive",
    tone: "danger",
    icon: Siren,
  },
  WATCH: {
    label: RISK_TIER_LABELS.WATCH,
    badge: "secondary",
    tone: "default",
    icon: Activity,
  },
  NORMAL: {
    label: RISK_TIER_LABELS.NORMAL,
    badge: "success",
    tone: "success",
    icon: CheckCircle2,
  },
};

/** Outlined chip classes for roster tables — one treatment per tier. */
const RISK_TIER_CHIP_CLASS: Record<string, string> = {
  NORMAL: "border-success text-success-700",
  WATCH: "border-warning text-warning-700",
};

const RISK_TIER_CHIP_CLASS_AT_RISK = "border-danger text-danger-700";

export function getRiskTierChipClass(riskTier: string): string {
  return RISK_TIER_CHIP_CLASS[riskTier] ?? RISK_TIER_CHIP_CLASS_AT_RISK;
}

/** Canonical dashboard/filter order; severity desc, normal last. */
export const RISK_TIER_ORDER = ["HIGH", "WATCH", "NORMAL"] as const;
