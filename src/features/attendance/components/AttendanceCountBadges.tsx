import { Badge } from "../../../components/base";
import { findStatusCatalogItem } from "../../status-catalog/hooks/useStatusCatalog";
import type { StatusCatalogItem } from "../../status-catalog/types/status-catalog.types";

interface AttendanceCounts {
  present: number;
  absent: number;
  late: number;
}

const COUNT_BY_INTERNAL_CODE: Record<string, keyof AttendanceCounts> = {
  P_PRESENT: "present",
  P_ABSENT: "absent",
  P_LATE: "late",
};

export function AttendanceCountBadges({
  catalog,
  counts,
}: {
  catalog: readonly StatusCatalogItem[];
  counts: AttendanceCounts;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(COUNT_BY_INTERNAL_CODE).map(([code, countKey]) => {
        const item = findStatusCatalogItem(catalog, code);
        return (
          <Badge
            className="min-w-[68px] justify-center"
            key={code}
            variant={item?.badgeVariant ?? "secondary"}
          >
            {item?.shortLabel ?? item?.label ?? code} {counts[countKey]}
          </Badge>
        );
      })}
    </div>
  );
}
