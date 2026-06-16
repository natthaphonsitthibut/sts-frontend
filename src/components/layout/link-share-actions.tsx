import type { ReactNode } from "react";
import { buttonVariants } from "../base";
import { cn } from "../../lib/utils";
import { CopyButton } from "./copy-button";

interface LinkShareActionsProps {
  /** Public, ready-to-open link (already normalized to the current origin). */
  link: string;
  className?: string;
  /** Optional action rendered right-aligned on the same row (e.g. "สร้างใหม่"). */
  trailing?: ReactNode;
}

function buildLineShareUrl(url: string): string {
  return `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`;
}

/**
 * The single share row used everywhere a public link is shown (create result,
 * task detail, attendance/login link detail). Renders the mono link box plus the
 * three shared actions — คัดลอก / เปิดลิงก์ / แชร์ผ่าน LINE — so every page shares
 * one look and wording instead of hand-rolling its own buttons.
 */
export function LinkShareActions({ link, className, trailing }: LinkShareActionsProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="break-all rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-sm">
        {link}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <CopyButton label="คัดลอก" size="md" value={link} variant="outline" />
        <a
          className={buttonVariants({ variant: "outline" })}
          href={link}
          rel="noreferrer"
          target="_blank"
        >
          เปิดลิงก์
        </a>
        <a
          className={buttonVariants({ variant: "outline" })}
          href={buildLineShareUrl(link)}
          rel="noreferrer"
          target="_blank"
        >
          แชร์ผ่าน LINE
        </a>
        {trailing ? <div className="ml-auto">{trailing}</div> : null}
      </div>
    </div>
  );
}
