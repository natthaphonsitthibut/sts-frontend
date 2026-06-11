import { cn } from "../../../lib/utils";
import { getCaseStatusMeta } from "../lib/case-presentation";
import type { CaseStatus } from "../types/cases.types";

export function CaseStatusBadge({ status }: { status: CaseStatus }) {
  const meta = getCaseStatusMeta(status);
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold",
        meta.badgeClass,
      )}
    >
      {meta.label}
    </span>
  );
}
