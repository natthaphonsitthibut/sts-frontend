import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { buttonVariants } from "../base";
import { cn } from "../../lib/utils";
import { LinkShareButton } from "./link-share-dialog";

interface LinkShareActionsProps {
  /** Public, ready-to-open link (already normalized to the current origin). */
  link: string;
  className?: string;
  /** Optional action rendered beside the right-aligned open-link action. */
  trailing?: ReactNode;
}

/**
 * The single share row used everywhere a public link is shown (create result,
 * task detail, attendance/login link detail). Detailed share targets live in
 * the shared dialog, so this row stays compact: share and open-link icons only.
 */
export function LinkShareActions({ link, className, trailing }: LinkShareActionsProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="break-all rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
        {link}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <LinkShareButton compact link={link} />
        {trailing}
        <a
          aria-label="เปิดลิงก์"
          className={cn(
            buttonVariants({ size: "sm", variant: "outline" }),
            "size-9 px-0",
          )}
          href={link}
          rel="noreferrer"
          target="_blank"
          title="เปิดลิงก์"
        >
          <ExternalLink className="size-4" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
