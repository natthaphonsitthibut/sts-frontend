import { Badge } from "../../../components/base";
import { cn } from "../../../lib/utils";
import { getCaseStatusMeta } from "../lib/case-presentation";
import type { CaseStatus } from "../types/cases.types";

export function CaseStatusBadge({ status }: { status: CaseStatus | string }) {
  const meta = getCaseStatusMeta(status as CaseStatus);
  return (
    <Badge
      className={cn("w-[104px] justify-center whitespace-nowrap px-2", meta.badgeClass)}
      variant="secondary"
    >
      {meta.label}
    </Badge>
  );
}
