import { useMemo } from "react";
import { useStatusCatalog } from "../../status-catalog/hooks/useStatusCatalog";
import { RISK_TIER_LABELS } from "../lib/student-presentation";

/**
 * Risk-tier wording from the `STUDENT_RISK_TIER` catalogue, falling back to the
 * bundled labels until it resolves. Reading it here rather than hardcoding the
 * Thai strings is what lets a ministry wording change ship without a deploy.
 */
export function useRiskTierLabels(): {
  labels: Record<string, string>;
  getLabel: (tier: string) => string;
} {
  const items = useStatusCatalog("STUDENT_RISK_TIER").items;
  const labels = useMemo(() => {
    if (items.length === 0) return RISK_TIER_LABELS;
    return items.reduce<Record<string, string>>(
      (result, item) => ({ ...result, [item.code]: item.label }),
      {},
    );
  }, [items]);
  return {
    labels,
    getLabel: (tier: string) => labels[tier] ?? RISK_TIER_LABELS[tier] ?? tier,
  };
}
