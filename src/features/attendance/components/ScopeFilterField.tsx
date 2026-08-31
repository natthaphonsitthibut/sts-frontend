import { useState, type ReactNode } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import {
  Button,
  buttonVariants,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/base";
import { cn } from "../../../lib/utils";
import {
  formatScopeSummary,
  SCOPE_ALL_LABEL,
  type ScopeSummaryInput,
} from "../../../lib/scope-presentation";

interface ScopeFilterFieldProps {
  /**
   * The controls that narrow the scope, rendered inside the dialog. Omit them
   * when the actor's own data scope already fixes every level: the field then
   * states the scope instead of offering to change it.
   */
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
  /**
   * False when the actor's own data scope fixes every level. Pages that render
   * their controls unconditionally (disabled rather than absent) say so here
   * instead of having to strip the children out themselves.
   */
  editable?: boolean;
  /**
   * What the summary reads before anything is picked. A filter leaves this
   * alone — "ทุกจังหวัด" is the truthful answer for an unnarrowed list — but a
   * required picker (choose a room to check in) has no "all" member, and would
   * otherwise claim a nationwide scope it does not have.
   */
  emptyLabel?: string;
  /**
   * What this field narrows, when it is not the page's own data. The users page
   * filters by the *user's* scope rather than by a school the user belongs to,
   * and saying so is the difference between "no results" reading as a bug or as
   * the answer.
   */
  label?: string;
  /** Reset every level this field owns, from inside the dialog. */
  onClear?: () => void;
  scope: ScopeSummaryInput;
}

const SCOPE_PREFIX = "ขอบเขต";

/**
 * What scope the page is showing, and — when there is a choice — the way in.
 *
 * The geographic cascade is six dependent controls that only make sense walked
 * top to bottom, so laying them out as six peers implied an independence they
 * never had, and cost a mobile screen's worth of height before the first row
 * of data. They move into a dialog; what stays on the page is the answer, in
 * the filter's own words.
 *
 * The summary renders whether or not anything is selectable. A teacher locked
 * to one room can change nothing, and is exactly the person who most needs the
 * page to say which room they are looking at.
 */
export function ScopeFilterField({
  children,
  className,
  disabled,
  editable = true,
  emptyLabel,
  label = SCOPE_PREFIX,
  onClear,
  scope,
}: ScopeFilterFieldProps) {
  const [open, setOpen] = useState(false);
  const parts = formatScopeSummary(scope);
  const summary =
    emptyLabel && parts.length === 1 && parts[0] === SCOPE_ALL_LABEL.province
      ? emptyLabel
      : parts.join(" · ");

  if (!children || !editable) {
    return (
      <p className={cn("truncate text-sm text-slate-600", className)}>
        {label} <span className="font-semibold text-slate-900">{summary}</span>
      </p>
    );
  }

  return (
    <>
      {/* Built from `buttonVariants` rather than `Button`: a school name is far
          longer than a button label, and Button lays its content out
          `whitespace-nowrap` inside a centering grid — the name has to be free
          to truncate against the trigger's own width instead of setting it. */}
      <button
        className={cn(
          buttonVariants({ variant: "outline" }),
          "max-w-full justify-start",
          className,
        )}
        disabled={disabled}
        onClick={() => setOpen(true)}
        type="button"
      >
        <SlidersHorizontal aria-hidden="true" className="size-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-left">
          <span className="font-normal text-slate-500">{label} </span>
          {summary}
        </span>
        <ChevronDown aria-hidden="true" className="size-4 shrink-0" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClose={() => setOpen(false)}>
          <DialogHeader>
            <DialogTitle icon={SlidersHorizontal}>เลือก{label}</DialogTitle>
          </DialogHeader>
          {/* One stack walked top to bottom, every control the same width.
              Use the base `Select`/`Combobox` here rather than the toolbar's
              `FilterSelect`/`FilterCombobox`: those carry a fixed
              `sm:w-[180px]` meant for a filter row, which inside a dialog
              leaves a ragged column with the school name clipped. */}
          <DialogBody className="grid gap-3">{children}</DialogBody>
          <DialogFooter align={onClear ? "between" : "right"}>
            {onClear ? (
              <Button onClick={onClear} variant="outline">
                ล้างตัวกรอง
              </Button>
            ) : null}
            <Button onClick={() => setOpen(false)}>เสร็จสิ้น</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
