import { Badge } from "../../../components/base";
import type { CaseBadgeVariant, CaseStatus } from "../types/cases.types";
import {
  findStatusCatalogItem,
  useStatusCatalog,
} from "../../status-catalog/hooks/useStatusCatalog";
import { getCaseTrackingStatusPresentation } from "../lib/case-presentation";

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
