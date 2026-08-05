import type { ReactNode } from "react";
import { Card, CardContent } from "../base";
import { cn } from "../../lib/utils";

interface GuestReceiptCardProps {
  /** Heading of the form that was submitted — composed from the task, not fixed copy. */
  title: string;
  /** Short confirmation line under the heading. */
  message: ReactNode;
  className?: string;
}

/**
 * Submission receipt shown to a guest after a magic-link form is sent: an accent
 * bar in the brand colour over a left-aligned heading and one confirmation line.
 * It deliberately carries no icon and no action — the link is spent at this
 * point, so there is nothing left for the reader to do.
 */
export function GuestReceiptCard({ className, message, title }: GuestReceiptCardProps) {
  return (
    <Card className={cn("overflow-hidden rounded-lg border-slate-200 shadow-sm", className)}>
      <div className="h-2.5 bg-primary" aria-hidden="true" />
      <CardContent className="space-y-5 p-6 sm:p-7">
        <h1 className="text-balance text-xl font-bold leading-8 text-slate-900 sm:text-2xl sm:leading-9">
          {title}
        </h1>
        <p className="text-sm leading-6 text-slate-700">{message}</p>
      </CardContent>
    </Card>
  );
}
