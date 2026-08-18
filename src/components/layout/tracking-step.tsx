import type { ReactNode, Ref } from "react";
import { ClipboardList } from "lucide-react";
import { Card } from "../base/card";

/**
 * Shared numbered-rail stepper shell for any "ขั้นตอนการติดตาม" flow — used by
 * both the admin case detail page and the guest report page so the two stay
 * visually identical instead of drifting apart as separate implementations.
 */
export function TrackingStepsCard({
  children,
  ref,
  statusContent,
  statusClassName,
  statusLabel,
}: {
  children: ReactNode;
  /** Lets a caller find the step rail — the case page scrolls to the live step. */
  ref?: Ref<HTMLDivElement>;
  statusContent?: ReactNode;
  statusClassName: string;
  statusLabel: string;
}) {
  return (
    <Card className="p-5" ref={ref}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <ClipboardList className="size-5 text-ink" aria-hidden="true" />
          ขั้นตอนการติดตาม
        </h2>
        <span className="text-sm font-semibold text-slate-700">
          สถานะการติดตาม :{" "}
          {statusContent ?? (
            <span className={statusClassName}>{statusLabel}</span>
          )}
        </span>
      </div>
      <div className="space-y-5">{children}</div>
    </Card>
  );
}

export function TrackingStep({
  active,
  children,
  connectNext,
  connectPrev,
  number,
  title,
}: {
  active?: boolean;
  children: ReactNode;
  connectNext?: boolean;
  connectPrev?: boolean;
  number: number;
  title: string;
}) {
  return (
    <div
      className="grid items-stretch gap-4 lg:grid-cols-[112px_minmax(0,1fr)]"
      data-flow-step={number}
      data-flow-step-active={active ? "true" : undefined}
      data-flow-step-title={title}
    >
      <div className="flex items-center gap-3 lg:flex-col lg:gap-2">
        <div
          aria-hidden="true"
          className={
            connectPrev
              ? "hidden w-px flex-1 bg-slate-200 lg:-mt-5 lg:block"
              : "hidden flex-1 lg:block"
          }
        />
        <span
          className={
            active
              ? "flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-white bg-primary text-lg font-bold text-white ring-1 ring-primary shadow-sm"
              : "flex size-12 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-bold text-slate-700"
          }
        >
          {number}
        </span>
        <span className="font-bold text-slate-800">{title}</span>
        <div
          aria-hidden="true"
          className={
            connectNext
              ? "hidden w-px flex-1 bg-slate-200 lg:-mb-5 lg:block"
              : "hidden flex-1 lg:block"
          }
        />
      </div>
      <div
        className={
          active
            ? "rounded-xl border border-primary bg-brand-active p-4 sm:p-5"
            : "rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5"
        }
      >
        {children}
      </div>
    </div>
  );
}
