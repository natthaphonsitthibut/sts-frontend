import { Badge } from "../../../components/base";
import type { CaseBadgeVariant, CaseStatus } from "../types/cases.types";
import {
  findStatusCatalogItem,
  useStatusCatalog,
} from "../../status-catalog/hooks/useStatusCatalog";

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
  return (
    <Badge
      className="w-[104px] justify-center whitespace-nowrap px-2"
      variant={badgeVariant ?? item?.badgeVariant ?? "secondary"}
    >
      {label || item?.label || status || "-"}
    </Badge>
  );
}
