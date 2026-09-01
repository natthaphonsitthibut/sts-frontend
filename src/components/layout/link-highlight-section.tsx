import type { ReactNode } from "react";
import { X } from "lucide-react";
import { IconButton } from "../base";
import { cn } from "../../lib/utils";

interface LinkHighlightSectionProps {
  /** What the link is, named the way the page names it. */
  title: ReactNode;
  /** Who it is for and how long it lasts — what stops it being sent to the wrong person. */
  description?: ReactNode;
  /** Copy, share, edit — whatever this particular link can do. */
  actions?: ReactNode;
  /**
   * Given only by a section the reader is meant to be able to put away. A link
   * that stands on its own (the school's LINE invitation) has no dismiss: it is
   * the link's status, not a notice about something that just happened.
   */
  onDismiss?: () => void;
  className?: string;
}

/**
 * The green band that hands a freshly available link straight to the person who
 * needs it, instead of making them go find it.
 *
 * One component for every such band so they cannot drift apart — the school's
 * standing LINE invitation and a delegation link created a second ago look and
 * behave the same, and differ only in what they let you do.
 */
export function LinkHighlightSection({
  actions,
  className,
  description,
  onDismiss,
  title,
}: LinkHighlightSectionProps) {
  return (
    <section
      className={cn(
        "relative mb-4 rounded-lg border border-success/25 bg-success-50 px-4 py-3",
        // Room for the dismiss so a long title never runs under it.
        onDismiss && "pr-12",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-sm text-slate-600">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {/* Corner ✕, exactly the dialog's — putting away a notice is not an action
          on the link, and a solid button sitting beside คัดลอก read as one, as
          if it closed the link itself. */}
      {onDismiss ? (
        <IconButton
          aria-label="ปิดแถบนี้"
          // Tighter than the dialog's own ✕ on purpose: a dialog is tall enough
          // that `top-3` still reads as the corner, while this band is two lines
          // and the same offset floats the glyph toward the middle.
          className="absolute right-2 top-2 z-20 size-7 border-transparent bg-transparent text-slate-500 shadow-none hover:border-transparent hover:bg-slate-100 hover:text-slate-900"
          icon={X}
          iconClassName="size-4"
          onClick={onDismiss}
        />
      ) : null}
    </section>
  );
}
