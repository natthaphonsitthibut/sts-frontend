import type { BadgeProps } from "../../../components/base";
import type { StatusCatalogItem } from "../types/status-catalog.types";

export type StatusSummaryTone =
  | NonNullable<StatusCatalogItem["summaryTone"]>
  | "orange"
  | "purple";

/**
 * The summary-card tone a status should wear, taken from the colour the catalog
 * already gives its badge.
 *
 * Only some domains define `summaryTone` — the referral statuses come back with
 * it null — while `badgeVariant` is set for every status. Deriving the card's
 * tone from the badge keeps a status one colour wherever it appears; a page
 * picking its own is how a card ends up disagreeing with the badge naming the
 * same thing directly beneath it.
 */
const TONE_BY_BADGE_VARIANT: Record<
  NonNullable<BadgeProps["variant"]>,
  StatusSummaryTone
> = {
  default: "info",
  secondary: "default",
  destructive: "danger",
  success: "success",
  warning: "orange",
  purple: "purple",
};

export function statusSummaryTone(
  status: StatusCatalogItem | undefined,
): StatusSummaryTone {
  if (!status) return "default";
  return (
    status.summaryTone ??
    TONE_BY_BADGE_VARIANT[status.badgeVariant] ??
    "default"
  );
}
