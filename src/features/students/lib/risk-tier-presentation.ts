import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  Siren,
  type LucideIcon,
} from "lucide-react";
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
  MEDIUM: {
    label: RISK_TIER_LABELS.MEDIUM,
    badge: "warning",
    tone: "warning",
    icon: ShieldAlert,
  },
  LOW: {
    label: RISK_TIER_LABELS.LOW,
    badge: "default",
    tone: "info",
    icon: AlertCircle,
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

/**
 * Outlined chip classes for roster tables. Deliberately coarser than `tone`:
 * the tiers are slated to collapse to เสี่ยง / เฝ้าระวัง / ปกติ, so every
 * at-risk tier shares one treatment until that consolidation lands.
 */
const RISK_TIER_CHIP_CLASS: Record<string, string> = {
  NORMAL: "border-success text-success-700",
  WATCH: "border-warning text-warning-700",
};

const RISK_TIER_CHIP_CLASS_AT_RISK = "border-danger text-danger-700";

export function getRiskTierChipClass(riskTier: string): string {
  return RISK_TIER_CHIP_CLASS[riskTier] ?? RISK_TIER_CHIP_CLASS_AT_RISK;
}

/** Canonical dashboard/filter order; severity desc, normal last. */
export const RISK_TIER_ORDER = [
  "HIGH",
  "MEDIUM",
  "WATCH",
  "LOW",
  "NORMAL",
] as const;
