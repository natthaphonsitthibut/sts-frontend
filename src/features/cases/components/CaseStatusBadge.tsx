import { Badge } from "../../../components/base";
import type { CaseBadgeVariant, CaseStatus } from "../types/cases.types";
import {
  findStatusCatalogItem,
  useStatusCatalog,
} from "../../status-catalog/hooks/useStatusCatalog";
import { getCaseTrackingStatusPresentation } from "../lib/case-presentation";

/**
 * Badges stay on the plain workflow status (`เสร็จสิ้น`) even when the case
 * carries a completion outcome — owner's call, because `เสร็จสิ้น : ส่งต่อหน่วยงาน`
 * overflows the table column. The outcome is shown on the case detail header.
 */
export function CaseStatusBadge({
  badgeVariant,
  label,
  status,
}: {
  badgeVariant?: CaseBadgeVariant | null;
  label?: string | null;
  status: CaseStatus | string;
}) {
  const catalog = useStatusCatalog("CASE_WORKFLOW").items;
  const item = findStatusCatalogItem(catalog, status);
  const presentation = getCaseTrackingStatusPresentation(status);
  return (
    <Badge
      className={`max-w-full justify-center whitespace-normal break-words px-2 text-center leading-4 ${presentation.badgeClassName}`}
      data-case-status={status}
      variant={badgeVariant ?? item?.badgeVariant ?? "secondary"}
    >
      {label || item?.label || presentation.label}
    </Badge>
  );
}
