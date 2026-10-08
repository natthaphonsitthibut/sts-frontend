import { TriangleAlert } from "lucide-react";
import { HoverTooltip } from "../base";

/**
 * The warning beside a row's status when its link needs the school's
 * attention — ran out, or locked — with the reason on hover.
 */
export function LinkWarningIndicator({ label }: { label: string }) {
  return (
    <HoverTooltip label={label}>
      <TriangleAlert
        className="size-4 shrink-0 text-danger"
        aria-hidden="true"
      />
    </HoverTooltip>
  );
}
