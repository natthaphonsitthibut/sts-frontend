import type { ReactNode } from "react";
import { ExternalLink, MessageCircle } from "lucide-react";
import { buttonVariants } from "../base";
import { cn } from "../../lib/utils";
import { CopyButton } from "./copy-button";

interface LinkShareActionsProps {
  /** Public, ready-to-open link (already normalized to the current origin). */
  link: string;
  className?: string;
  /** Optional action rendered beside the right-aligned open-link action. */
  trailing?: ReactNode;
}

function buildLineShareUrl(url: string): string {
  return `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`;
}

/**
 * The single share row used everywhere a public link is shown (create result,
 * task detail, attendance/login link detail). Renders the mono link box plus the
 * three shared actions — คัดลอก / แชร์ผ่าน LINE / เปิดลิงก์ — so every page shares
 * one look and wording instead of hand-rolling its own buttons.
 */
export function LinkShareActions({ link, className, trailing }: LinkShareActionsProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="break-all rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-sm">
        {link}
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <div className="flex justify-start">
          <CopyButton label="คัดลอก" size="md" value={link} variant="outline" />
        </div>
        <a
          className={cn(
            buttonVariants({ variant: "default" }),
            "justify-self-start border-line bg-line text-white hover:border-line-hover hover:bg-line-hover sm:justify-self-center",
          )}
          href={buildLineShareUrl(link)}
          rel="noreferrer"
          target="_blank"
        >
          <MessageCircle className="size-4" aria-hidden="true" />
          แชร์ผ่าน LINE
        </a>
        <div className="flex flex-wrap justify-start gap-2 sm:justify-end">
          {trailing}
          <a
            className={buttonVariants({ variant: "default" })}
            href={link}
            rel="noreferrer"
            target="_blank"
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            เปิดลิงก์
          </a>
        </div>
      </div>
    </div>
  );
}
